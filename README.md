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

General Purpose Arbitrator (Subcourt 0, 31 votes, [Primary Document](https://ipfs.kleros.io/ipfs/QmaUr6hnSVxYD899xdcn2GUVtXVjXoSXKZbce3zFtGWw4H/Question_Resolution_Policy.pdf)) 
- https://etherscan.io/address/0x728cba71a3723caab33ea416cb46e2cc9215a596#code
- https://kovan.etherscan.io/address/0x99489d7bb33539f3d1a401741e56e8f02b9ae0cf#code
- https://rinkeby.etherscan.io/address/0xe27768bdb76a9b742b7ddcfe1539fadaf3b89bc7#code

DAO Governance Arbitrator (Subcourt 4, 5 votes, [Primary Document](https://ipfs.kleros.io/ipfs/QmXyo9M4Z2XY6Nw9UfuuUNzKXXNhvt24q6pejuN9RYWPMr/Reality_Module_Governance_Oracle-Question_Resolution_Policy.pdf)) 
- https://etherscan.io/address/0xf72cfd1b34a91a64f9a98537fe63fbab7530adca#code

DAO Governance Arbitrator (Subcourt 2, 1 vote, [Primary Document](https://ipfs.kleros.io/ipfs/QmXyo9M4Z2XY6Nw9UfuuUNzKXXNhvt24q6pejuN9RYWPMr/Reality_Module_Governance_Oracle-Question_Resolution_Policy.pdf)) 
- https://kovan.etherscan.io/address/0xb9fdd2904cbcc5543F02DB948B2CE59Ef10A950E#code


