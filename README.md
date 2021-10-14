# Realitio Arbitrator With Appeals

A [Realitio](https://github.com/RealityETH/monorepo/blob/main/packages/contracts/development/contracts/Realitio_v2_1.sol) arbitrator that implements appeals via [IDisputeResolver](https://github.com/kleros/dispute-resolver-interface-contract). Implementing this interface ensures compatibility with https://resolve.kleros.io user interface.

### The Flow

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

`yarn compile`

### Deploy

Here is an example deployment command: 

`ETHERSCAN=W1VIXXXXXXHTHTIS INFURA_PROJECT_ID=b0XXXXXX6802 PRIVATE_KEY=1XXXX0b80 npx hardhat deploy --network kovan  --reset --gasprice 70000000000`


Deployment script will automatically verify the source code.

### Live instances:

General Purpose Arbitrator (General Court, 31 votes): 
- https://etherscan.io/address/0x728cba71a3723caab33ea416cb46e2cc9215a596
- https://kovan.etherscan.io/address/0x99489d7bb33539f3d1a401741e56e8f02b9ae0cf#readContract

DAO Governance Arbitrator (Techical Court, 5 votes):
- https://etherscan.io/tx/0x3b965785fd408ad4c268af1f2d2d48271d0d5b3a0c35d873f92b5b47c9dd74db
