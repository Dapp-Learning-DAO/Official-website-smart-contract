import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Bytes, Address, BigInt } from "@graphprotocol/graph-ts"
import { ClaimSuccess } from "../generated/schema"
import { ClaimSuccess as ClaimSuccessEvent } from "../generated/HappyRedPacket/HappyRedPacket"
import { handleClaimSuccess } from "../src/happy-red-packet"
import { createClaimSuccessEvent } from "./happy-red-packet-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let id = Bytes.fromI32(1234567890)
    let claimer = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let claimed_value = BigInt.fromI32(234)
    let token_address = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let newClaimSuccessEvent = createClaimSuccessEvent(
      id,
      claimer,
      claimed_value,
      token_address
    )
    handleClaimSuccess(newClaimSuccessEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("ClaimSuccess created and stored", () => {
    assert.entityCount("ClaimSuccess", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "ClaimSuccess",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "claimer",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "ClaimSuccess",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "claimed_value",
      "234"
    )
    assert.fieldEquals(
      "ClaimSuccess",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "token_address",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
