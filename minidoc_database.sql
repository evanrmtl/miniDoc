CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE CHECK(length(username) <= 25),
    password_hash TEXT NOT NULL
);

CREATE TABLE files (
    file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    file_content TEXT
);

CREATE TABLE users_files (
    user_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, file_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(file_id) ON DELETE CASCADE
);
