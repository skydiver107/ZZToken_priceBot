const Web3 = require('web3')
const HDWalletProvider = require('truffle-hdwallet-provider')

const dotenv = require('dotenv')
const { ethers, providers } = require('ethers')
dotenv.config()

const config = require('./config/index.ts')
const abis = require('./abis.json')
const usdcABI = require('./usdc.json')
const web3 = new Web3(process.env.WSS_URL)
const { defaultAbiCoder } = require('@ethersproject/abi')

const provider = new HDWalletProvider(
  process.env.MNEMONIC,
  "https://matic-mumbai.chainstacklabs.com"
)

const web3Provider = new Web3(provider)
const contract = new web3Provider.eth.Contract(abis, config.POZ_ADDRESS)
const usdc = new web3Provider.eth.Contract(usdcABI, "0x41Df7cb131A04A8456b0F6dF9A740cD8c1CddBae")

var options = {
  reconnect: {
    auto: true,
    delay: process.env.REFRESH,
    maxAttempts: process.env.MAX_ATTEMPTS,
    onTimeout: false
  },
  address: config.PAIR_ADDRESS,
  topics: config.TOPICS
}

var subscription = web3.eth.subscribe('logs', options, function (error: any, result: any) {
  if (error) console.debug(error)
}).on('data', async function (log: any) {
  const { data } = log
  if (data) {
    try {
      console.log("---- price adjustment started ----")
      const txCount = await web3Provider.eth.getTransactionCount(provider.addresses[0])
      const pendingTx = await web3Provider.eth.getTransactionCount(provider.addresses[0], "pending")
      const nonce = pendingTx + txCount
      console.log("nonce:", nonce)
      const [amount0In, , ,] = defaultAbiCoder.decode([
        'uint256', 'uint256', 'uint256', 'uint256'], data)
      console.log("amount0In:", amount0In)
      const tradeType = amount0In.gt(ethers.BigNumber.from('0'))
      console.log("tradeType:", tradeType)
      await contract.methods.dynamicAdjustment(tradeType).send({
        from: provider.addresses[0],
        chainId: 80001,
        nonce
      })
      console.log("---- price adjustment finished ----")
    } catch (error) {
      console.log("--- error found in adjustment ---")
      console.log(error)
    }
  }
}).on('changed', function (log: any) {
  console.log('changed', log)
})