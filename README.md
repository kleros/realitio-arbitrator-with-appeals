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
