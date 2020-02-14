'use strict';

const Handler = require('./handler');

const Client = require('graphql-ld').Client;
const QueryEngineComunica = require('graphql-ld-comunica').QueryEngineComunica;

// Comunica query engines cache
// Saved by stringified list of sorted datasources

/**
 * Handles GraphQL-LD querying.
 *
 * @type {module.GraphQLLDHandler}
 */
module.exports = class GraphQLLDHandler extends Handler {

  constructor(logger) {
    super();

    this.logger = logger;
    this.comunicaEngineCache = {};
  }

  /**
   * Instantiates the variables in the given GraphQL-LD query using the given path variables and query parameters,
   * then executes the given GraphQL-LD query using comunica.
   *
   * @param graphQLLDInfo, object containing the comunica configuration, cache setting, the GraphQL query and the JSON-LD context
   * @param variables, object containing path parameters to value mapping
   * @param queryParams, object containing query parameter to value mapping
   * @returns {Promise<>}, GraphQL-LD query results
   */
  async handle(graphQLLDInfo, variables, queryParams) {
    const newQueries = Object.keys(graphQLLDInfo.queries).reduce((acc, val) => {
      const query = graphQLLDInfo.queries[val];
      acc[val] = this.substituteQueryParams(this.substituteVariables(query, variables), queryParams);
      return acc;
    }, {});

    const clientConfig = {
      context: graphQLLDInfo.context,
    };

    // If cache is enabled --> search for the engine in cache
    if (graphQLLDInfo.cache) {
      // Sort the data sources before looking in cache
      graphQLLDInfo.comunicaConfig.sources.sort();

      if (!(graphQLLDInfo.comunicaConfig.sources.toString() in this.comunicaEngineCache)) {
        this.comunicaEngineCache[graphQLLDInfo.comunicaConfig.sources.toString()] = new QueryEngineComunica(graphQLLDInfo.comunicaConfig);
        this.logger.verbose('Comunica query engine cache: MISS');
      } else {
        this.logger.verbose('Comunica query engine cache: HIT');
      }
      clientConfig.queryEngine = this.comunicaEngineCache[graphQLLDInfo.comunicaConfig.sources.toString()];
    } else {  // --> create a new one
      clientConfig.queryEngine = new QueryEngineComunica(graphQLLDInfo.comunicaConfig);
    }

    this.logger.debug(JSON.stringify(newQueries));
    const client = new Client(clientConfig);
    const results = {};
    for (const key of Object.keys(newQueries)) {
      results[key] = await client.query({
        query: newQueries[key]
      });
      this.logger.verbose(JSON.stringify(results[key]));
    }

    // flatten results array of arrays
    return results;
  }

  /**
   * Instantiates the given variables in the query.
   *
   * @param query
   * @param variables
   *
   * @returns string (newQuery)
   */
  substituteVariables(query, variables) {
    const keys = variables && Object.keys(variables);
    if (keys && keys.length > 0) {
      let newQuery = query;
      keys.forEach(key => {
        // Replace underscores with spaces
        let val = variables[key];
        if (typeof val === 'string' || val instanceof String) {
          val = '"' + val.replace(/_/g, ' ') + '"';
        }
        newQuery = newQuery.replace('$' + key, val);
      });
      return newQuery;
    } else {
      return query;
    }
  };

  /**
   * Instantiates the given query parameters in the query.
   * Pagination parameters are converted to GraphQL format.
   *
   * @param query
   * @param params
   *
   * @returns string (newQuery)
   */
  substituteQueryParams(query, params) {
    const keys = params && Object.keys(params);
    if (keys && keys.length > 0) {
      // Pagination parameters to GraphQL format
      if (keys.includes('page') && keys.includes('limit')) {
        params.limit = Number(params.limit);
        params.offset = Number(params.page) * params.limit;
      }
      delete params.page;
      return this.substituteVariables(query, params);
    } else {
      return query;
    }
  };
};