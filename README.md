# Omen Subgraph

This repo defines a subgraph which is used by Omen.

The `docker-compose.yml` contains a Docker Compose configuration suitable for spinning up a test environment.

The `package.json` contains a definition of this package. The `scripts` key defines a number of scripts useful for development. Among these are:

* `npm test`: sets up the test environment, builds and deploys the subgraph onto the test environment, and runs the test suite.
* `npm run bootstrap-test`: sets up the test environment by running the migrations and creating the subgraph to be used in the tests.
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

## Entities

### Question

Represents a question on Realitio. 

* `id` - question ID on Realitio.
* `templateId` - question's template ID.
* `data` - question data, which gets interpolated into the question template.
* `title`, `category`, `language` - for the default `single-select` template, the default `binary` template, and a special 'nuanced binary' template, these fields get parsed out of the question data.
* `outcomes` - gets parsed out of the question data for the default `single-select` template.
* `arbitrator` - account to use for arbitrating the results of the question in the event of a dispute.
* `openingTimestamp` - unix timestamp marking when (usually in the future) the result of the question may be reported to Realitio.
* `timeout` - duration in seconds for how long before the result of a question gets finalized.
* `currentAnswer` - the latest reported answer registered on Realitio on for this question.
* `currentAnswerBond` - bond in ETH associated with this question.
* `currentAnswerTimestamp` - unix timestamp marking when the current answer was submitted.
* `isPendingArbitration` - indicates whether this question is currently undergoing arbitration.
* `arbitrationOccurred` - indicates whether or not arbitration has already occurred.
* `answerFinalizedTimestamp` - unix timestamp marking when the answer will be considered final. Use this to determine if the question is answered only if arbitration is not underway.
* `indexedFixedProductMarketMakers` - a list of FixedProductMarketMakers based on this question, where updates to the fields on this question will be pushed.
