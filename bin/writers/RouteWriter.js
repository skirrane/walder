const Writer = require('./writer');
const fs = require('fs');
const Routes = require('../resources/routes');
const util = require('util');

/**
 * Writes the express app/routing code.
 *
 * @type {module.RouteWriter}
 */
module.exports = class RouteWriter extends Writer {
    constructor(file, portNumber) {
        super(file);
        this.portNumber = portNumber;
    }

    preWrite() {
        // Imports
        this.sb.append(Routes.EXPRESS_IMPORT);
        this.sb.append(Routes.GRAPHQLLD_IMPORT);
        this.sb.append(Routes.PIPE_MODULES_IMPORT);

        // Basic app structure
        this.sb.append(Routes.CREATE_APP);

        super.preWrite();
    }

    write(route, graphQLLDWriter, pipeModuleWriter) {
        this.sb.appendFormat(Routes.FIRST_LINE, route.method, route.path);

        this.sb.appendLine(Routes.BODY);

        // Write query code
        graphQLLDWriter.writeQueryExecutionStart(this.sb);

        // Write pipe modules code
        pipeModuleWriter.writePipeExecution(this.sb);

        graphQLLDWriter.writeQueryExecutionEnd(this.sb);

        this.sb.appendLine(Routes.LAST_LINE);

        super.write();
    }

    postWrite() {
        // Basic app structure
        this.sb.append(util.format(Routes.START_APP, this.portNumber, this.portNumber));

        super.postWrite();
    }
};