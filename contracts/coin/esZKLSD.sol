// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// import "hardhat/console.sol";

contract esZKLSD is Ownable, ReentrancyGuard, ERC20("esZKLSD Token", "esZKLSD") {
  using Address for address;
  using SafeMath for uint256;
  using EnumerableSet for EnumerableSet.AddressSet;
  using SafeERC20 for IERC20;

  IERC20 public immutable zkLSDToken; // zkLSD token to escrow to/from
  EnumerableSet.AddressSet private _whitelistAddresses; // addresses allowed to send/receive esZKLSD

  uint256 public minRedeemDurationInDays = 1;
  uint256 public maxRedeemDurationInDays = 20;
  uint256 public redeemRatioDenominator = 100;
  uint256[] public redeemRatios = [25, 42, 52, 60, 65, 70, 74, 77, 80, 83, 85, 87, 89, 91, 93, 95, 97, 98, 99, 100];
  mapping(address => RedeemInfo[]) public userRedeems; // User's redeeming instances
  uint256 private _redeemFees;

  struct RedeemInfo {
    uint256 esZKLSDAmount; // esZKLSD amount to redeem
    uint256 zkLSDAmount; // zkLSD amount to receive when vesting has ended
    uint256 endTime;
  }

  constructor(IERC20 _zkLSDToken) {
    zkLSDToken = _zkLSDToken;
    _whitelistAddresses.add(address(this));
  }

  /**************************************************/
  /****************** PUBLIC VIEWS ******************/
  /**************************************************/

  /*
   * @dev returns redeemable zkLSD for "amount" of esZKLSD vested for "duration" seconds
   */
  function getZKLSDAmountByVestingDuration(uint256 amount, uint256 durationInDays) public view returns (uint256) {
    require(durationInDays >= minRedeemDurationInDays, "getZKLSDAmountByVestingDuration: durationInDays too short");

    uint256 durationInDaysCapped = durationInDays;
    if(durationInDaysCapped > maxRedeemDurationInDays) durationInDaysCapped = maxRedeemDurationInDays;

    uint256 ratio = redeemRatios[durationInDaysCapped.sub(1)];
    uint256 zkLSDAmount = amount.mul(ratio).div(redeemRatioDenominator);
    return zkLSDAmount < amount ? zkLSDAmount : amount;
  }

  /**
   * @dev returns quantity of "userAddress" pending redeems
   */
  function getUserRedeemsLength(address userAddress) external view returns (uint256) {
    return userRedeems[userAddress].length;
  }

  function getUserRedeem(address userAddress, uint256 redeemIndex) external view validateRedeem(userAddress, redeemIndex) returns (uint256 zkLSDAmount, uint256 esZKLSDAmount, uint256 endTime) {
    RedeemInfo storage _redeem = userRedeems[userAddress][redeemIndex];
    return (_redeem.zkLSDAmount, _redeem.esZKLSDAmount, _redeem.endTime);
  }

  function getWhitelistAddressesLength() external view returns (uint256) {
    return _whitelistAddresses.length();
  }

  function getWhitelistAddress(uint256 index) external view returns (address) {
    require(index < _whitelistAddresses.length(), "getWhitelistAddress: invalid index");
    return _whitelistAddresses.at(index);
  }

  function isAddressWhitelisted(address account) external view returns (bool) {
    return _whitelistAddresses.contains(account);
  }

  function redeemFees() external view returns (uint256) {
    return _redeemFees;
  }

  /*******************************************************/
  /****************** OWNABLE FUNCTIONS ******************/
  /*******************************************************/


  /**
   * @dev Adds or removes addresses from the whitelist
   */
  function setWhitelistAddress(address account, bool whitelisted) external nonReentrant onlyOwner {
    require(account != address(0), "Zero address detected");
    require(account != address(this), "setWhitelistAddress: Cannot remove esZKLSD from whitelist");

    if(whitelisted) _whitelistAddresses.add(account);
    else _whitelistAddresses.remove(account);

    emit UpdateWhitelistAddress(account, whitelisted);
  }

  function withdrawRedeemFees(address to) external nonReentrant onlyOwner {
    require(to != address(0), "Zero address detected");
    require(_redeemFees > 0, 'No redeem fees to withdraw');

    _transfer(address(this), to, _redeemFees);
    emit RedeemFeesWithdrawn(to, _redeemFees);

    _redeemFees = 0;
  }

  /*****************************************************************/
  /******************  EXTERNAL PUBLIC FUNCTIONS  ******************/
  /*****************************************************************/

  /**
   * @dev Escrow caller's "amount" of zkLSD to esZKLSD
   */
  function escrow(uint256 amount) external nonReentrant {
    _escrow(amount, _msgSender());
  }

  /**
   * @dev Initiates redeem process (esZKLSD to zkLSD)
   */
  function redeem(uint256 esZKLSDAmount, uint256 vestingDurationInDays) external nonReentrant {
    require(esZKLSDAmount > 0, "esZKLSDAmount too small");
    require(esZKLSDAmount <= balanceOf(_msgSender()), "Redeem amount exceeds balance");

    _transfer(_msgSender(), address(this), esZKLSDAmount);

    uint256 zkLSDAmount = getZKLSDAmountByVestingDuration(esZKLSDAmount, vestingDurationInDays);
    emit Redeem(_msgSender(), esZKLSDAmount, zkLSDAmount, vestingDurationInDays);

    userRedeems[_msgSender()].push(RedeemInfo(esZKLSDAmount, zkLSDAmount, block.timestamp.add(vestingDurationInDays.mul(1 days))));
  }

  /**
   * @dev Finalizes redeem process when vesting duration has been reached
   *
   * Can only be called by the redeem entry owner
   */
  function finalizeRedeem(uint256 redeemIndex) external nonReentrant validateRedeem(_msgSender(), redeemIndex) {
    RedeemInfo storage _redeem = userRedeems[_msgSender()][redeemIndex];
    require(block.timestamp >= _redeem.endTime, "finalizeRedeem: vesting duration has not ended yet");

    // console.log('balance, allocation amount: %s, redeeming amount: %s', balance.allocatedAmount, balance.redeemingAmount);
    _finalizeRedeem(_msgSender(), _redeem.esZKLSDAmount, _redeem.zkLSDAmount);

    // remove redeem entry
    _deleteRedeemEntry(redeemIndex);
  }

  
  /**
   * @dev Cancels an ongoing redeem entry
   *
   * Can only be called by its owner.
   */
  function cancelRedeem(uint256 redeemIndex) external nonReentrant validateRedeem(_msgSender(), redeemIndex) {
    RedeemInfo storage _redeem = userRedeems[_msgSender()][redeemIndex];

    _transfer(address(this), _msgSender(), _redeem.esZKLSDAmount);

    emit CancelRedeem(_msgSender(), _redeem.esZKLSDAmount);

    // remove redeem entry
    _deleteRedeemEntry(redeemIndex);
  }


  /********************************************************/
  /****************** INTERNAL FUNCTIONS ******************/
  /********************************************************/

  /**
   * @dev Escrow caller's "amount" of zkLSD into esZKLSD to "to"
   */
  function _escrow(uint256 amount, address to) internal {
    require(amount != 0, "escrow: amount cannot be null");

    // mint new esZKLSD
    _mint(to, amount);

    emit Escrow(_msgSender(), to, amount);
    zkLSDToken.safeTransferFrom(_msgSender(), address(this), amount);
  }

  function _finalizeRedeem(address userAddress, uint256 esZKLSDAmount, uint256 zkLSDAmount) internal {
    zkLSDToken.safeTransfer(userAddress, zkLSDAmount);
    _burn(address(this), zkLSDAmount);

    uint256 fees = esZKLSDAmount.sub(zkLSDAmount);
    if (fees > 0) {
      _redeemFees = _redeemFees.add(fees);
      emit RedeemFeesAccrued(_msgSender(), esZKLSDAmount, fees);
    }

    emit FinalizeRedeem(userAddress, esZKLSDAmount, zkLSDAmount);
  }


  function _deleteRedeemEntry(uint256 index) internal {
    userRedeems[_msgSender()][index] = userRedeems[_msgSender()][userRedeems[_msgSender()].length - 1];
    userRedeems[_msgSender()].pop();
  }

  /**
   * @dev Hook override to forbid transfers except from whitelisted addresses and minting
   */
  function _beforeTokenTransfer(address from, address to, uint256 /*amount*/) internal view override {
    require(from == address(0) || _whitelistAddresses.contains(from) || _whitelistAddresses.contains(to), "transfer: not allowed");
  }

  /***********************************************/
  /****************** MODIFIERS ******************/
  /***********************************************/

  /*
   * @dev Check if a redeem entry exists
   */
  modifier validateRedeem(address userAddress, uint256 redeemIndex) {
    require(redeemIndex < userRedeems[userAddress].length, "validateRedeem: invalid index");
    _;
  }

  /********************************************/
  /****************** EVENTS ******************/
  /********************************************/

  event Escrow(address indexed from, address to, uint256 amount);
  event Redeem(address indexed userAddress, uint256 esZKLSDAmount, uint256 zkLSDAmount, uint256 durationInDays);
  event FinalizeRedeem(address indexed userAddress, uint256 esZKLSDAmount, uint256 zkLSDAmount);
  event CancelRedeem(address indexed userAddress, uint256 esZKLSDAmount);
  event RedeemFeesAccrued(address indexed user, uint256 totalAmount, uint256 fees);
  event RedeemFeesWithdrawn(address indexed to, uint256 amount);
  event UpdateWhitelistAddress(address account, bool whitelisted);
}