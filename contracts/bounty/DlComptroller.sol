// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.19;

import "@sablier/v2-core/src/SablierV2Comptroller.sol";

contract DLSablierV2Comptroller is SablierV2Comptroller {
    constructor(address manage) SablierV2Comptroller(manage) {}
}