'use strict';

const YAML = require('yaml');
const GraphQLLD = require('./graphQLLD');
const PipeModules = require('./pipeModules');
const fs = require('fs');
const util = require('util');


module.exports.walterServer = async (app) => {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                                                                                                //
    //                                              Config file parsing                                               //
    //                                                                                                                //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Data sources
    const DataSourceParser = require('../lib/parsers/DataSourceParser');

    // Routes
    const RouteParser = require('../lib/parsers/RouteParser');

    // GraphQL-LD
    const GraphQLLDParser = require('../lib/parsers/GraphQLLDParser');

    // Pipe modules
    const PipeModuleParser = require('../lib/parsers/PipeModuleParser');
    const PipeModuleLoader = require('../lib/loaders/PipeModuleLoader');

    // Parse the config file
    const configFilePath = '/Users/driesmarzougui/Documents/work/IDLab/KNoWS/walter/example/config_example.yaml';   // todo: remove this
    const file = fs.readFileSync(configFilePath, 'utf8');
    const yamlData = YAML.parse(file);

    const dataSources = new DataSourceParser(yamlData).parse();


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                                                                                                //
    //                                     Express Route initialisation                                               //
    //                                                                                                                //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const queryCallback = (graphQLLD, pipeModules) => {
        return (req, res, next) => {
            GraphQLLD.executeQuery(GraphQLLD.comunicaConfig, graphQLLD, req.params, req.query)
                .then((data) => {
                    // Apply pipe modules to query result
                    pipeModules
                        .then((pipeFunctions) => {
                            const pipeResult = PipeModules.pipe(pipeFunctions)(data);

                            res.send(pipeResult);
                        })
                })
                .catch((error) => {
                    console.log(error);
                    res.send(error.message);
                })
        }
    };

    for (let path in yamlData.paths) {
        for (let method in yamlData.paths[path]) {
            const route = new RouteParser(method, path, yamlData).parse();
            const graphQLLD = new GraphQLLDParser(method, path, yamlData).parse();
            const pipeModules = new PipeModuleParser(yamlData.paths[path][method].postprocessing).parse();
            const pipeFunctions = new PipeModuleLoader(pipeModules).load()
                .then((loadedPipeModules) => {
                    return loadedPipeModules.map((pipeModule) => { return pipeModule.function });
                });

            const callBack = queryCallback(graphQLLD, pipeFunctions);

            switch (method) {
                case 'get':
                    app.get(route.path, callBack);
                    break;
                case 'post':
                    app.post(route.path, callBack);
                    break;
                case 'put':
                    app.put(route.path, callBack);
                    break;
                case 'patch':
                    app.patch(route.path, callBack);
                    break;
                case 'head':
                    app.head(route.path, callBack);
                default:
                    throw Error(util.format('"%s" is not a valid HTTP routing method.', this.method));
            }
        }

    }
};