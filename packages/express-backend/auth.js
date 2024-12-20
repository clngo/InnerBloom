import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userService from "./services/user-service.js";

export function registerUser(req, res) {
    const { username, pwd } = req.body; // from form
    const userToAdd = req.body;
    if (!username || !pwd) {
        res.status(400).send("Bad request: Invalid input data.");
    }
    userService.getUsers(username).then((user) => {
        if (!Array.isArray(user)) {
            res.status(500).send("Server Error");
        } else if (user.length >= 1) {
            res.status(409).send("Username already taken");
        } else {
            bcrypt
                .genSalt(10)
                .then((salt) => bcrypt.hash(pwd, salt))
                .then((hashedPassword) => {
                    generateAccessToken(username).then((token) => {
                        userToAdd["pwd"] = hashedPassword;
                        userService
                            .addUser(userToAdd)
                            .then((user) => {
                                console.log("Token:", token);
                                res.status(201).send({ token: token });
                            })
                            .catch((error) => {
                                console.log(error);
                            });
                    });
                });
        }
    });
}

export function loginUser(req, res) {
    const { username, pwd } = req.body; //from form
    userService.getUsers(username).then((retrievedUser) => {
        if (!retrievedUser || retrievedUser.length === 0) {
            // invalid username
            res.status(401).send("Unauthorized");
        } else {
            bcrypt
                .compare(pwd, retrievedUser[0]["pwd"])
                .then((matched) => {
                    if (matched) {
                        generateAccessToken(username).then((token) => {
                            res.status(200).send({ token: token });
                        });
                    } else {
                        // invalid password
                        res.status(401).send("Unauthorized");
                    }
                })
                .catch((error) => {
                    // error
                    res.status(500).send("Server Error");
                });
        }
    });
}

export function authenticateUser(req, res, next) {
    const authHeader = req.headers["authorization"];
    const username = req.params.username;
    const token = authHeader;

    if (!token) {
        console.log("No token received");
        res.status(401).end();
    } else {
        jwt.verify(token, process.env.TOKEN_SECRET, (error, decoded) => {
            if (decoded) {
                console.log(decoded);
                if (username != undefined && decoded["username"] == username) {
                    next();
                } else {
                    console.log(
                        "Incorrect User, expected:",
                        decoded["username"],
                        "Got:",
                        username
                    );
                    res.status(401).end();
                }
            } else {
                console.log("JWT error:", error);
                res.status(401).end();
            }
        });
    }
}

function generateAccessToken(username) {
    return new Promise((resolve, reject) => {
        jwt.sign(
            { username: username },
            process.env.TOKEN_SECRET,
            { expiresIn: "1d" },
            (error, token) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(token);
                }
            }
        );
    });
}
