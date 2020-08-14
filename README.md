# Omen Subgraph

This repo defines a subgraph which is used by Omen.

The `docker-compose.yml` contains a Docker Compose configuration suitable for spinning up a test environment.

The `package.json` contains a definition of this package. The `scripts` key defines a number of scripts useful for development. Among these are:

* `npm test`: sets up the test environment, builds and deploys the subgraph onto the test environment, and runs the test suite.
* `npm run bootstrap-tests`: sets up the test environment by running the migrations and creating the subgraph to be used in the tests.
* `npm run test-fresh-graph`: builds and deploys the subgraph onto the test environment, and runs the test suite.
* `npm run test-existing-graph`: runs the test suite.
* `npm run codegen`: rerenders code templates and runs the `graph codegen` command, which regenerates subgraph mapping support source files.
* `npm run publish-graph:mainnet` and `npm run publish-graph:rinkeby`: rerenders the code templates using configurations suitable to the network mentioned, and then uses the Graph CLI to deploy the subgraph. May only be done by authorized parties. To deploy your own instance of this subgraph, you can change `protofire/omen` to `<your-account>/omen`, where `<your-account>` is your account on [the Graph's website](thegraph.com).

A typical development session might look like this:

```bash
docker-compose down  # to clear data from previous containers on your machine
docker-compose up -d # to spin up services required for subgraph development
npm test             # first run can use npm test

# after editing source files, etc.
npm run codegen

# when wanting to rebuild the graph to run the test suite
npm run test-fresh-graph

# when wanting to just run the test suite again after editing tests
npm run test-existing-graph

docker-compose down # clean up session at the end
```

## Code templates

Some parts of the configuration and mapping code depend on the addresses of specific contracts on the chain or which network the subgraph is being run on. In those instances, a Truffle script `render-templates.js` is executed to render certain `<file>.template.<ext>` files into their `<file>.<ext>` counterparts. The templates themselves are just Mustache templates, and the parameters are gotten from the Web3 provider's view of the connected network and the various Truffle artifacts which result from either running the migrations that deploy the necessary contracts onto the test chain or injecting canonical information about public contracts from the `networks.json` file into these artifacts.
