import { events, FUJI } from '../dist/domain/protocol.js'
export const hashWord = x => BigInt(x).toString(16).padStart(64, '0')
export const account = '0x' + '11'.repeat(20)
export const gym = '0x' + '22'.repeat(20)
const hash = '0x' + '33'.repeat(32)
export function openingLog() {
  return {
    address: FUJI.vault, topics: [events.AgreementOpened[0], `0x${hashWord(1)}`,
      `0x${account.slice(2).padStart(64,'0')}`, `0x${gym.slice(2).padStart(64,'0')}`],
    data: '0x' + [0,1003,hash,1,2,1].map(hashWord).join(''),
    blockNumber: '0x' + FUJI.deploymentBlock.toString(16),
    blockHash: '0x' + '44'.repeat(32), transactionHash: '0x' + '55'.repeat(32),
    transactionIndex: '0x0', logIndex: '0x1', removed: false,
  }
}
const view = [account,gym,0,1,hash,1,2,1,0,0,0,0,0,1003,0,0,0,0,0]
const balances = [1003,0,0,0,1003]
export const mockView = () => [
  '0x'+view.map(hashWord).join(''),
  '0x'+balances.map(hashWord).join(''),
]
