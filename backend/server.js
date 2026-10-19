// const http = require('https');
// const app = require('./app');
// const port = process.env.PORT || 3000;

// const server = http.createServer(app);



// server.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });


const http = require('http');
const app = require('./app');
const port = process.env.PORT || 4000;

const server = http.createServer(app);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

