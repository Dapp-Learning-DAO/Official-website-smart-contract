import { BigInt,Bytes } from "@graphprotocol/graph-ts"
import {
  ClaimSuccess as ClaimSuccessEvent,
  CreationSuccess as CreationSuccessEvent,
  RefundSuccess as RefundSuccessEvent,
} from "../generated/HappyRedPacket/HappyRedPacket"
import {
  Claim,
  Redpacket,
  Refund,
  Lastupdate
} from "../generated/schema"

const ONE = "1"

export function handleClaimSuccess(event: ClaimSuccessEvent): void {
  let tempClaimID = event.transaction.hash.concatI32(event.logIndex.toI32())
  let claimID = tempClaimID.toHexString()
  let claim = new Claim(
    claimID
  )
  let packetId = event.params.id.toString()
  claim.happyRedPacketId = packetId
  claim.claimer = event.params.claimer
  claim.nonce = event.params.id
  claim.claimedValue = event.params.claimed_value
  claim.tokenAddress = event.params.token_address

  claim.blockNumber = event.block.number
  claim.blockTimestamp = event.block.timestamp
  claim.transactionHash = event.transaction.hash
  claim.redpacket = packetId

  claim.save()

  let redpacket = Redpacket.load(packetId)
  if (redpacket === null) {
    return
  }
  let oneBigInt = BigInt.fromString("1")
  let tempBigInt = redpacket.remainToClaim.minus(oneBigInt)
  redpacket.remainToClaim = tempBigInt
  let zeroBigInt = BigInt.fromString("0")
  if(redpacket.remainToClaim.equals(zeroBigInt)){
    redpacket.allClaimed = true
  }
  redpacket.save()

  let lastupdate = Lastupdate.load(ONE)
  if (lastupdate === null) {
    return
  }
  lastupdate.lastupdateTimestamp = event.block.timestamp
  lastupdate.save()

}

export function handleCreationSuccess(event: CreationSuccessEvent): void {
  let packetId = event.params.id.toString()
  let redpacket = new Redpacket(
    packetId
  )

  let lastupdate = Lastupdate.load(ONE)
  if (lastupdate === null) {
    lastupdate = new Lastupdate(
      ONE
    )
  }

  lastupdate.lastupdateTimestamp = event.block.timestamp
  lastupdate.save()

  redpacket.total = event.params.total
  redpacket.happyRedPacketId = packetId
  redpacket.nonce = event.params.id
  redpacket.name = event.params.name
  redpacket.message = event.params.message
  redpacket.creator = event.params.creator
  redpacket.creationTime = event.params.creation_time
  redpacket.tokenAddress = event.params.token_address
  redpacket.number = event.params.number
  redpacket.remainToClaim = event.params.number
  redpacket.ifrandom = event.params.ifrandom
  redpacket.duration = event.params.duration

  redpacket.blockNumber = event.block.number
  redpacket.blockTimestamp = event.block.timestamp
  redpacket.transactionHash = event.transaction.hash
  redpacket.expireTimestamp = event.params.creation_time.plus(event.params.duration)
  redpacket.refunded = false
  redpacket.allClaimed = false

  redpacket.save()
}

export function handleRefundSuccess(event: RefundSuccessEvent): void {
  let tempRefundId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let refundID = tempRefundId.toHexString()
  let entity = new Refund(
    refundID
  )
  let packetId = event.params.id.toString()
  entity.happyRedPacketId = packetId
  entity.nonce = event.params.id
  entity.tokenAddress = event.params.token_address
  entity.remainingBalance = event.params.remaining_balance

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  let recdpacket = Redpacket.load(packetId)
  if (recdpacket === null) {
    return
  }
  recdpacket.refunded = true
  recdpacket.save()

  let lastupdate = Lastupdate.load(ONE)
  if (lastupdate === null) {
    return
  }
  lastupdate.lastupdateTimestamp = event.block.timestamp
  lastupdate.save()
}
