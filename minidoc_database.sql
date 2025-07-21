CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);

CREATE TABLE session (
    session_id TEXT PRIMARY KEY,
    user_id INTEGER DEFAULT NULL,
    created_at INTEGER DEFAULT NULL,
    expires_at INTEGER DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE files (
    file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT DEFAULT NULL,
    file_content TEXT DEFAULT NULL,
    file_updated_at INTEGER DEFAULT NULL,
    owner_id INTEGER DEFAULT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE users_files (
    user_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    role TEXT DEFAULT NULL,
    PRIMARY KEY (user_id, file_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(file_id) ON DELETE CASCADE
);

