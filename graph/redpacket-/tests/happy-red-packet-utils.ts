import { newMockEvent } from "matchstick-as"
import { ethereum, Bytes, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  ClaimSuccess,
  CreationSuccess,
  RefundSuccess
} from "../generated/HappyRedPacket/HappyRedPacket"

export function createClaimSuccessEvent(
  id: Bytes,
  claimer: Address,
  claimed_value: BigInt,
  token_address: Address
): ClaimSuccess {
  let claimSuccessEvent = changetype<ClaimSuccess>(newMockEvent())

  claimSuccessEvent.parameters = new Array()

  claimSuccessEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromFixedBytes(id))
  )
  claimSuccessEvent.parameters.push(
    new ethereum.EventParam("claimer", ethereum.Value.fromAddress(claimer))
  )
  claimSuccessEvent.parameters.push(
    new ethereum.EventParam(
      "claimed_value",
      ethereum.Value.fromUnsignedBigInt(claimed_value)
    )
  )
  claimSuccessEvent.parameters.push(
    new ethereum.EventParam(
      "token_address",
      ethereum.Value.fromAddress(token_address)
    )
  )

  return claimSuccessEvent
}

export function createCreationSuccessEvent(
  total: BigInt,
  id: Bytes,
  name: string,
  message: string,
  creator: Address,
  creation_time: BigInt,
  token_address: Address,
  number: BigInt,
  ifrandom: boolean,
  duration: BigInt
): CreationSuccess {
  let creationSuccessEvent = changetype<CreationSuccess>(newMockEvent())

  creationSuccessEvent.parameters = new Array()

  creationSuccessEvent.parameters.push(
    new ethereum.EventParam("total", ethereum.Value.fromUnsignedBigInt(total))
  )
  creationSuccessEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromFixedBytes(id))
  )
  creationSuccessEvent.parameters.push(
    new ethereum.EventParam("name", ethereum.Value.fromString(name))
  )
  creationSuccessEvent.parameters.push(
    new ethereum.EventParam("message", ethereum.Value.fromString(message))
  )
  creationSuccessEvent.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  )
  creationSuccessEvent.parameters.push(
    new ethereum.EventParam(
      "creation_time",
      ethereum.Value.fromUnsignedBigInt(creation_time)
    )
  )
  creationSuccessEvent.parameters.push(
    new ethereum.EventParam(
      "token_address",
      ethereum.Value.fromAddress(token_address)
    )
  )
  creationSuccessEvent.parameters.push(
    new ethereum.EventParam("number", ethereum.Value.fromUnsignedBigInt(number))
  )
  creationSuccessEvent.parameters.push(
    new ethereum.EventParam("ifrandom", ethereum.Value.fromBoolean(ifrandom))
  )
  creationSuccessEvent.parameters.push(
    new ethereum.EventParam(
      "duration",
      ethereum.Value.fromUnsignedBigInt(duration)
    )
  )

  return creationSuccessEvent
}

export function createRefundSuccessEvent(
  id: Bytes,
  token_address: Address,
  remaining_balance: BigInt
): RefundSuccess {
  let refundSuccessEvent = changetype<RefundSuccess>(newMockEvent())

  refundSuccessEvent.parameters = new Array()

  refundSuccessEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromFixedBytes(id))
  )
  refundSuccessEvent.parameters.push(
    new ethereum.EventParam(
      "token_address",
      ethereum.Value.fromAddress(token_address)
    )
  )
  refundSuccessEvent.parameters.push(
    new ethereum.EventParam(
      "remaining_balance",
      ethereum.Value.fromUnsignedBigInt(remaining_balance)
    )
  )

  return refundSuccessEvent
}
