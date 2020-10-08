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

### Category

Represents statistics for a category of questions on Realitio.

* `id` - string of the category itself. Note that this is case-sensitive, meaning two different spellings or casings of a category will result in two different entities.
* `numConditions` - number of conditions prepared tied to a Realitio question that is filed under this category.
* `numOpenConditions` - number of aforementioned conditions that have not been resolved yet.
* `numClosedConditions` - number of conditions in this category that has been resolved.

### Condition

Represents conditions on the Conditional Tokens contract.

* `id` - condition ID on the Conditional Tokens.
* `oracle` - oracle account of the condition.
* `questionId` - question ID of the condition.
* `question` - if the oracle is the Realitio to Conditional Tokens oracle adapter, this field is the associated Realitio Question entity.
* `outcomeSlotCount` - outcome slot count of the condition.
* `resolutionTimestamp` - unix timestamp marking when this condition got resolved.
* `payouts` - array of payouts for each outcome slot reported by the oracle.

### FixedProductMarketMaker

Represents a `FixedProductMarketMaker`, an automated market maker which buys and sells conditional tokens for their backing collateral token.

* `id` - address of the market maker contract.
* `creator` - address of the account which created the market maker.
* `creationTimestamp` - unix timestamp marking when this market maker was created.
* `collateralToken` - address of the collateral token.
* `conditions` - the conditions associated with this market maker. The conditional tokens traded by this FPMM are split through all these conditions.
* `fee` - a proportion of each trade with this market maker gets retained as collateral token that is added to the fee pool. This value is a BigInt and should be interpreted as a proportion out of 10^18.
* `collateralVolume` - the amount of collateral this market maker has traded so far. This does not include fees, and is denoted in the collateral's native units.
* `outcomeTokenAmounts` - the amount of conditional tokens held in this market maker's liquidity pool.
* `outcomeTokenMarginalPrices` - the marginal prices of the aforementioned outcome tokens, which may be used to derive event probability or expected value estimates.
* `outcomeSlotCount` - the number of different outcome tokens traded by this market maker. Is the product of the outcome slot counts of every condition associated with this FPMM.
* `liquidityMeasure` - the sum of outcome token amounts and their respective marginal prices. Used to estimate the value held in the liquidity pool.
* `liquidityParameter` - the nth root of the product of the outcome token amounts. A different measure of the depth of the liquidity pool.
* `lastActiveDay` - the floor(unix timestamp marking of the last trade / 86400), used to help figure out daily volume.
* `collateralVolumeBeforeLastActiveDay` - a snapshot of the collateral volume before the start of the last active day. Aids in computing the `runningDailyVolume`
* `runningDailyVolume` - collateralVolume between the start of the `lastActiveDay` and the last trade. May actually be the running volume of a previous day.
* `lastActiveDayAndRunningDailyVolume` - field combining `lastActiveDay` in the high bits with `runningDailyVolume` in the low bits.
* `scaledCollateralVolume`, `scaledLiquidityMeasure`, `scaledLiquidityParameter`, `scaledRunningDailyVolume` - scaled versions of their respective fields accounting for the `decimals` of the collateral token. If the `decimals` value cannot be obtained from the contract, will default to scaling these values as if they have 18 decimal points.
* `lastActiveDayAndScaledRunningDailyVolume` - same as `lastActiveDayAndRunningDailyVolume` except the `runningDailyVolume` gets scaled to have 6 decimals from whatever the contract native value is. This is mainly here in order to allow sorting by 24-hour volume.
* `curatedByDxDao` - denotes whether this particular FPMM has been curated by the DxDAO.
* `condition` - if this FPMM's conditions has only a single element, that condition is copied here.
* `question` - if this FPMM has only a single condition, and that condition is linked to a Realitio question, then this question is linked here.
* `templateId`, `data`, `title`, `outcomes`, `category`, `language`, `arbitrator`, `openingTimestamp`, `timeout` - copied from a linked question if possible.
* `indexedOnQuestion` - if at the creation of this FPMM, a linked Question entity is successfully found, and this FPMM is one of the first 100 FPMMs linked to this question, then this flag is set to true, and the FPMM is appended to the question entity's `indexedFixedProductMarketMakers` field.
* `resolutionTimestamp`, `payouts` - if this FPMM is `indexedOnQuestion`, these fields are actively mirrored from the associated `condition`.
* `currentAnswer`, `currentAnswerBond`, `currentAnswerTimestamp`, `isPendingArbitration`, `arbitrationOccurred`, `answerFinalizedTimestamp` - if this FPMM is `indexedOnQuestion`, these fields are actively mirrored from the associated `question`.

### FPMMTrade

Represents a trade on a given `FixedProductMarketMaker`, the market maker with a buy or a sell conditional tokens.

* `id` - address of the trade.
* `creator` - address of the user.
* `creationTimestamp` - unix timestamp.
* `type` - Sell or Buy type
* `fpmm` - The FixedProductMarketMaker.
* `title` - The Question title.
* `collateralToken` - The collateral token for the FixedProductMarketMaker market.
* `investmentAmount` - the amount of the trade.
* `feeAmount` - fee on the market for the trade.
* `outcomeIndex` - the traded outcome.
- `outcomeTokensBought` - amount of the outcome tokens bought on the trade.