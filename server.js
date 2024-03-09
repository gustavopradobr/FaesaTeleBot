async function startServer(port){
        var path = require('path');
        var express = require('express');
        var app = express();
        
        var dir = path.join(__dirname, '');
        
        app.use(express.static(dir));
        
        app.listen(port, function () {
            console.log(`Listening on http://localhost:${port}/`);
            return Promise.resolve();
        });
}
module.exports = { startServer }; 