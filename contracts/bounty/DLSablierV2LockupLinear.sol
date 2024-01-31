// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.19;

import "@sablier/v2-core/src/SablierV2LockupLinear.sol";

contract DLSablierV2LockupLinear is SablierV2LockupLinear {
    constructor(address manage, address comptroller, address desc) SablierV2LockupLinear(manage, ISablierV2Comptroller(comptroller), ISablierV2NFTDescriptor(desc)) {}
}