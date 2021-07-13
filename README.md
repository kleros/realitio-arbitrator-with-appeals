# realitio-arbitrator-proxy-with-appeals
A [Realitio v2](https://github.com/realitio/realitio-contracts/blob/master/truffle/contracts/Realitio_v2_1.sol) arbitrator implementation that also implements [IDisputeResolver](https://github.com/kleros/dispute-resolver-interface-contract).

```
             Kleros                         RealitioArbitratorWithAppeals                         Realitio
          <IArbitrator>                          <IArbitrator>
                                                 <IArbitrable>
                                                 <IRealitioArbitrator>
                                                 <IDisputeResolver>


 ┌──────────────────────────────┐        ┌─────────────────────────────────┐       ┌──────────────────────────────────────┐
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │   createDispute() ◄──────────┼──1─────┼───────  requestArbitration──────┼───1───┼─────►  notifyOfArbitrationRequest()  │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │   executeRuling() ───────────┼───4────┼───────►  rule() ────────────────┼───────┼──►   assignWinnerAnd                 │
 │                              │        │                                 │       │      submitAnswerByArbitrator()      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │    appeal()  ◄───────────────┼───3────┼────────  fundAppeal()           │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 │                              │        │                                 │       │                                      │
 └──────────────────────────────┘        └─────────────────────────────────┘       └──────────────────────────────────────┘


1 User calls requestArbitration(). Internal calls to createDispute() and notifyOfArbitrationRequest().
2 Kleros jury decides. Ruling open for appeal.
3 If any user wants to appeal, can do so by calling fundAppeal(). When total amount raised by both parties, appeal round starts.
4 When ruling becomes finalized, user calls executeRuling(), causing internal calls to rule() and assignWinnerAndSubmitAnswerByArbitrator().
```

### Compile
yarn compile

### Deploy
Contract requires metaevindece during construction and metaevidence needs to know deployed contract address up-front, so it needs to be precomputed.

For dynamic script, see here: https://github.com/kleros/realitio-script

Reusable evidenceDisplayInterfaceURI: `/ipfs/QmQTnGNbRFpsS8zevPZTZA2ZioBKWM6u1HVCf9vLWkRuEH/index.html` You can just use this value for generating a new metaevidence, unless you want a new display interface.

Example metaevidence: 
```
{
  "category": "Oracle",
  "title": "Realitio Question",
  "description": "A Realitio question has been raised to arbitration.",
  "question": "Give an answer to the question.",
  "evidenceDisplayInterfaceURI": "/ipfs/QmQTnGNbRFpsS8zevPZTZA2ZioBKWM6u1HVCf9vLWkRuEH/index.html",
  "dynamicScriptURI": "/ipfs/QmSG1jvoScL99YSyzkSArd8w31moiW4BheUXvJNfPneduC/bundle.js"
}
```
After completing these for the [migration script](https://github.com/kleros/realitio-arbitrator-with-appeals/blob/master/migrations/2_deploy_ra.js), finally, this command will deploy and verify source code: `INFURA_PROJECT_ID=$INFURA_PROJECT_ID WALLET_KEY=$PRIVATE_KEY_OF_DEPLOYING_ACC ETHERSCAN=$ETHERSCAN_API_KEY NETWORK=$NETWORK_FROM_TRUFFLE_CONFIG yarn deploy-and-verify`
