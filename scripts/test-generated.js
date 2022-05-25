
const { createAggregatorAddJobInstruction, aggregatorAddJobParamsBeet } = require('../generated/switchboard/src/sdk')
const {PublicKey} = require("@solana/web3.js");

const inst = createAggregatorAddJobInstruction({
    job: new PublicKey("AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB"),
    aggregator: new PublicKey("AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB"),
    authority: new PublicKey("AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB")
}, {params: {}})
console.log(inst)

aggregatorAddJobParamsBeet.deserialize(new Buffer("0xABCDE"))

const isnt2 = createAggregatorAddJobInstruction({
    job: new PublicKey("AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB"),
    aggregator: new PublicKey("AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB"),
    authority: new PublicKey("AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB")
}, {params: {}})
console.log(isnt2)

process.exit(1)