(function () {
    'use strict';

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

    var options = { // establishing a tunnel
        host: 'localhost',
        port: 3128,
        method: 'CONNECT',
        path: 'bower-component-list.herokuapp.com:443',
    };
    
    var privateBowerOptions = {
        url: 'http://private-bower-repo:5678/packages/',
        sharePath: '\\\\private-bower-repo\\BowerPrivateRepo\\'
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
            var http = require("http");
            http.request(options).on('connect', function (res, socket, head) {
                var https = require("https");
                console.log('loading registered bower package list...');
                // should check res.statusCode here
                https.get({
                    host: 'bower-component-list.herokuapp.com',
                    socket: socket, // using a tunnel
                    agent: false    // cannot use a default agent
                }, function (res) {
                    let output = '';
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

    var packageNameList = ['epoch','fileupload'];

    function findPackageUrl(packageList, callback) {
        return new Promise(function (resolve) {
            var promise;
            for (let i = 0, len = packageList.length; i < len; ++i) {
                let el = packageList[i];
                if (packageNameList.indexOf(el.name) > -1) {
                    if (promise) {
                        promise = promise.then(() => { return callback(el.name, el.website) });
                    } else {
                        promise = callback(el.name, el.website);
                    }
                }
            }
            promise.then(()=>{resolve(packageList);})
        });

    }

    function cloneRepo(name, url) {
        console.log(`cloning: ${url}`);
        return executeAsync(`git clone ${url} ./${name}`);
    }
    function registerInPrivateBower(packageName) {
        return new Promise(function (resolve){
            console.log(`registering: ${packageName}`);
            
            var request = require('request');
            request.post(privateBowerOptions.url + packageName,
            { 
                form: { 
                    url: getlocalRepoPath(packageName) 
                },
            json: true
            },
            function (error, response, body) {
                if (response.statusCode == 200) {
                    console.log(`successfully registered ${packageName}`);
                    resolve();
                }else{
                    console.log(body);
                }
            });    
        });
        
    }
    function getlocalRepoPath(packageName){
        return `file:///${privateBowerOptions.sharePath}${packageName}\\.git`;
    }
    
    function registerAllPackages() {
        console.log(`registering all`);
        return new Promise(function (resolve) {
            if(packageNameList.length<=0){
                resolve();
                return;
            }
            
            let promise = new Promise(function(resolve){
                    registerInPrivateBower(packageNameList[0]);
                    resolve();
                });
            for(let i = 1,len = packageNameList.length;i<len;++i){
                    (function(name){
                        promise = promise.then(()=>{ registerInPrivateBower(name);});
                    })(packageNameList[i]);
                }

            promise.then(()=>{resolve();})
        });
    }

    getBowerPackagesAsync().then((packages) => 
                                    { 
                                        findPackageUrl(packages, cloneRepo).then(()=>
                                                                            {
                                                                                registerAllPackages().then(()=>
                                                                                                            {
                                                                                                                console.log('done');
                                                                                                            });
                                                                            });
                                    });

})();
