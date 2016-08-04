(function () {
    'use strict';
    var packageNameList = ['angular-local-storage','angular-selectize'];

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

    var options = {
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
            https.get({
                host: options.path,
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


    function findPackageUrl(packageList) {
        return new Promise((resolve)=> {
            var itemsList = [];
            for (var i = 0, len = packageList.length; i < len; ++i) {
                let el = packageList[i];
                if (packageNameList.indexOf(el.name) > -1) {
                    itemsList.push(el);
                }
            }
            resolve(itemsList);
        });
    }

    function cloneAllRepos(reposList) {
        var promiseList = [];
        for (let i = 0, len = reposList.length; i < len; ++i) {
            promiseList.push(cloneRepo(reposList[i].name,reposList[i].website));
        }
        return Promise.all(promiseList);
    }


    function cloneRepo(name, url) {
        console.log(`cloning ${name} from ${url}`);
        return executeAsync(`git clone ${url} ./${name}`);
    }

    getBowerPackagesAsync().then(findPackageUrl).then(cloneAllRepos);


})();
