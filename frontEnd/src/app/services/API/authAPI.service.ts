export function loginRequest (username : string, password : string) {

    const userInfo = {
        username: username,
        password: password
    }

    fetch('http://localhost:3000/login',{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userInfo)
    })
        .then(res => {
            console.log(res);
        });
}

export function registerRequest (username : string, password : string) {

    const userInfo = {
        username: username,
        password: password
    }

    fetch('http://localhost:3000/register',{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userInfo)
    })
        .then(res => {
            console.log(res);
        });
}