
import { ethers } from 'ethers';

const abi = new ethers.Interface([
  'function createRoom(string _item, uint256 _price, uint256 _collateral, bytes32 _joinCodeHash, bool _creatorIsSeller) external'
]);

const data = abi.encodeFunctionData('createRoom', [
  'Test item',
  ethers.parseUnits('1', 6),
  0,
  ethers.keccak256(ethers.toUtf8Bytes('TESTCODE')),
  false
]);

console.log('Encoded data:', data);
console.log('To:', '0x59Ab8013D4e65d938Ab83b235956e1881046BfB4');
console.log('From:', '0x23451D327828a85627Ee623733394047734Cea5a');
