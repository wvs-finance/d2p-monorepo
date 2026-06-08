// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

enum OptionPosition {
    SHORT,
    LONG
}


function fromBool(bool isLong) pure returns(OptionPosition res) {
    return isLong ? OptionPosition.LONG : OptionPosition.SHORT;
}
