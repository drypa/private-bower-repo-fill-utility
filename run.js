(function () {
    'use strict';

    function execute(commandText) {
        return executeAsync(commandText);
    }

    function executeAsync(commandText) {
        return new Promise(function (resolve) {
            const exec = require('child_process').exec;
            exec(commandText, (err, stdout, stderr) => {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log(stdout);
                resolve();
            });
        });
    }

    const commands = [
        'git clone https://github.com/jquery/jquery-dist.git ./jquery',
        'git clone https://github.com/angular-ui/ui-router.git ./angular-ui-router',
        'git clone https://github.com/PascalPrecht/bower-angular-translate-storage-cookie.git ./angular-translate-storage-cookie',
        'git clone https://github.com/PascalPrecht/bower-angular-translate-loader-partial.git ./angular-translate-loader-partial',
        'git clone https://github.com/PascalPrecht/bower-angular-translate.git ./angular-translate',
        'git clone https://github.com/angular/bower-angular-route.git ./angular-route',
        'git clone https://github.com/angular/bower-angular-cookies.git ./angular-cookies',
        'git clone https://github.com/jashkenas/underscore.git ./underscore',
        'git clone https://github.com/angular/bower-angular ./angular',
        'git clone https://github.com/twbs/bootstrap.git ./bootstrap',
        'git clone https://github.com/mbostock-bower/d3-bower.git ./d3'
    ];

    var options = { // establishing a tunnel
        host: 'localhost',
        port: 3128,
        method: 'CONNECT',
        path: 'bower-component-list.herokuapp.com:443',
    };
    
    /**
     * Тут сохраняем кэш списка bower пакетов.
     */
    var packageRepo;
    var cacheFilePath = 'bower.json'

    function getBowerPackagesAsync() {
        if (packageRepo) {
            return new Promise(function (resolve) {
                resolve(packageRepo);
            });
        }

        var fs = require('fs');
        if (fs.existsSync(cacheFilePath)) {
            return new Promise(function (resolve) {
                console.log('reading from cache');
                fs.readFile(cacheFilePath, 'utf8', function (err, content) {
                    if (err) throw err;
                    packageRepo = JSON.parse(content);
                    resolve(packageRepo);
                });
            });
        }


        return new Promise(function (resolve) {
            var https = require("https");
            var http = require("http");
            http.request({ // establishing a tunnel
                host: 'localhost',
                port: 3128,
                method: 'CONNECT',
                path: 'bower-component-list.herokuapp.com:443',
            }).on('connect', function (res, socket, head) {
                console.log('loading registered bower package list...');
                // should check res.statusCode here
                https.get({
                    host: 'bower-component-list.herokuapp.com',
                    socket: socket, // using a tunnel
                    agent: false    // cannot use a default agent
                }, function (res) {
                    var output = '';
                    res.setEncoding('utf8');
                    res.on('data', function (chunk) {
                        output += chunk;
                    });
                    res.on('end', function () {
                        saveCache(cacheFilePath, output);
                        packageRepo = JSON.parse(output);
                        resolve(packageRepo);
                    });
                });
            }).end();
        });

    }

    function saveCache(filePath, fileContent) {
        var fs = require('fs');
        fs.writeFile(filePath, fileContent, function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("The file was saved!");
        });
    }

    var packageNameList = ['underscore', 'angular', 'bootstrap'];

    function findPackageUrl(packageList, callback) {
        var promise;
        for (var i = 0, len = packageList.length; i < len; ++i) {
            let el = packageList[i];
            if (packageNameList.indexOf(el.name) > -1) {
                if (promise) {
                    promise = promise.then(() => { return callback(el.name, el.website) });
                } else {
                    promise = callback(el.name, el.website);
                }
            }
        }
    }

    function cloneRepo(name, url) {
        console.log(`cloning: ${url}`);
        return executeAsync(`git clone ${url} ./${name}`);
    }

    getBowerPackagesAsync().then((packages) => { findPackageUrl(packages, cloneRepo); });
    

    // for (let i = 0, len = commands.length; i < len; ++i) {
    //     execute(commands[i]);
    // }

})();
