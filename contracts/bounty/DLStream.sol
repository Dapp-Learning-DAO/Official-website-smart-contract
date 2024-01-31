// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ud60x18} from "@prb/math/src/UD60x18.sol";
import {ISablierV2LockupLinear} from "@sablier/v2-core/src/interfaces/ISablierV2LockupLinear.sol";
import {ISablierV2LockupDynamic} from "@sablier/v2-core/src/interfaces/ISablierV2LockupDynamic.sol";
import {Broker, LockupLinear, LockupDynamic, Lockup} from "@sablier/v2-core/src/types/DataTypes.sol";

contract DlStream {
    uint256 public _dlStreamId;
    address public owner;

    // Struct containing (i) the address of the broker assisting in creating the stream, and (ii) the
    // percentage fee paid to the broker from `totalAmount`, denoted as a fixed-point number. Both can be set to zero.
    Broker public broker;

    ISablierV2LockupLinear private linear;
    ISablierV2LockupDynamic private dynamic;
    
    struct StreamManageMent {
        address sender;
        address recipient;
        uint8 protocol;
        uint8 category; // 0 Linear 1 Dynamic
        uint240 streamId;
    }
    mapping(uint256 => StreamManageMent) private streamManageMents;

    /// @notice Struct encapsulating the parameters for the {SablierV2LockupLinear.createWithRange} function.
    /// @param sender The address streaming the assets, with the ability to cancel the stream. It doesn't have to be the
    /// same as `msg.sender`.
    /// @param recipient The address receiving the assets.
    /// @param totalAmount The total amount of ERC-20 assets to be paid, including the stream deposit and any potential
    /// fees, all denoted in units of the asset's decimals.
    /// @param asset The contract address of the ERC-20 asset used for streaming.
    /// @param cancelable Indicates if the stream is cancelable.
    /// @param transferable Indicates if the stream NFT is transferable.
    /// @param range Struct containing (i) the stream's start time, (ii) cliff time, and (iii) end time, all as Unix timestamps.
    /// percentage fee paid to the broker from `totalAmount`, denoted as a fixed-point number. Both can be set to zero.
    struct CreateLinearStream {
        address sender;
        address recipient;
        uint128 totalAmount;
        IERC20 asset;
        bool cancelable;
        bool transferable;
        LockupLinear.Range range;
    }

    /// @notice Struct encapsulating the parameters for the {SablierV2LockupDynamic.createWithMilestones}
    /// function.
    /// @param sender The address streaming the assets, with the ability to cancel the stream. It doesn't have to be the
    /// same as `msg.sender`.
    /// @param startTime The Unix timestamp indicating the stream's start.
    /// @param cancelable Indicates if the stream is cancelable.
    /// @param transferable Indicates if the stream NFT is transferable.
    /// @param recipient The address receiving the assets.
    /// @param totalAmount The total amount of ERC-20 assets to be paid, including the stream deposit and any potential
    /// fees, all denoted in units of the asset's decimals.
    /// @param asset The contract address of the ERC-20 asset used for streaming.
    /// @param broker Struct containing (i) the address of the broker assisting in creating the stream, and (ii) the
    /// percentage fee paid to the broker from `totalAmount`, denoted as a fixed-point number. Both can be set to zero.
    /// @param segments Segments used to compose the custom streaming curve.
    struct CreateDynamicStream {
        address sender;
        uint40 startTime;
        bool cancelable;
        bool transferable;
        address recipient;
        uint128 totalAmount;
        IERC20 asset;
        LockupDynamic.Segment[] segments;
    }

    struct CreateAmounts {
        uint128 deposit;
        uint128 protocolFee;
        uint128 brokerFee;
    }

    /// @notice Emitted when a stream is created.
    /// @param streamId The id of the newly created stream.
    /// @param sender The address streaming the assets, with the ability to cancel the stream.
    /// @param recipient The address receiving the assets.
    /// @param amounts Struct containing (i) the deposit amount, (ii) the protocol fee amount, and (iii) the
    /// broker fee amount, all denoted in units of the asset's decimals.
    /// @param asset The contract address of the ERC-20 asset used for streaming.
    /// @param cancelable Boolean indicating whether the stream will be cancelable or not.
    /// @param transferable Boolean indicating whether the stream NFT is transferable or not.
    /// @param range Struct containing (i) the stream's start time, (ii) cliff time, and (iii) end time, all as Unix
    /// timestamps.
    /// @param broker The address of the broker who has helped create the stream, e.g. a front-end website.
    event CreateLinearStreamEvent(
        uint256 streamId,
        address indexed sender,
        address indexed recipient,
        CreateAmounts amounts,
        IERC20 indexed asset,
        bool cancelable,
        bool transferable,
        LockupLinear.Range range,
        address broker
    );

    constructor(address _owner, address _linear, address _dynamic) {
        owner = _owner;
        linear = ISablierV2LockupLinear(_linear);
        dynamic = ISablierV2LockupDynamic(_dynamic);
    }

    modifier onlyOwner(address _owner) {
        require(msg.sender == owner, "NO Permission");
        _;
    }

    function setOwner(address _owner) public onlyOwner(msg.sender) {
        require(_owner != address(0), "Zero Address");
        owner = _owner;
    }

    function setBroker(Broker memory _broker) public onlyOwner(msg.sender) {
        broker = _broker;
    }

    /// @param protocol  1 sablier 2 superfluid 3 XXX
    function createLinearStream(
        CreateLinearStream memory _params,
        uint256 protocol
    ) public returns (uint256 streamId) {
        IERC20(_params.asset).transferFrom(
            msg.sender,
            address(this),
            _params.totalAmount
        );

        if (protocol == 1) {
            return _createLinearStream(_params);
        }
    }

    /// @param protocol  1 sablier 2 superfluid 3 XXX
    function createSablierDynamicStream(
        CreateDynamicStream memory _params,
        uint256 protocol
    ) public returns (uint256 streamId) {
        IERC20(_params.asset).transferFrom(
            msg.sender,
            address(this),
            _params.totalAmount
        );

        if (protocol == 1) {
            return _createDynamicStream(_params);
        }
    }

    function _createLinearStream(
        CreateLinearStream memory _params
    ) private returns (uint256 streamId) {
        IERC20(_params.asset).approve(address(linear), _params.totalAmount);

        LockupLinear.CreateWithRange memory params;

        params.sender = address(this);
        params.recipient = _params.recipient;
        params.totalAmount = _params.totalAmount;
        params.asset = IERC20(_params.asset);
        params.cancelable = _params.cancelable;
        params.transferable = _params.transferable;
        params.range = _params.range;
        params.broker = broker;//Broker(address(this), broker.fee);

        streamId = linear.createWithRange(params);
        uint256 dlStreamId = ++_dlStreamId;
        streamManageMents[dlStreamId] = StreamManageMent(
            _params.sender,
            _params.recipient,
            1,
            0,
            uint240(streamId)
        );

        emit CreateLinearStreamEvent({
            streamId: dlStreamId,
            sender: params.sender,
            recipient: params.recipient,
            amounts: CreateAmounts(params.totalAmount, 0, 0),
            asset: params.asset,
            cancelable: params.cancelable,
            transferable: params.transferable,
            range: params.range,
            broker: params.broker.account
        });
    }

    function _createDynamicStream(
        CreateDynamicStream memory _params
    ) private returns (uint256 streamId) {
        IERC20(_params.asset).approve(address(linear), _params.totalAmount);

        LockupDynamic.CreateWithMilestones memory params;

        params.sender = address(this);
        params.startTime = _params.startTime;
        params.cancelable = _params.cancelable;
        params.transferable = _params.transferable;
        params.recipient = _params.recipient;
        params.totalAmount = _params.totalAmount;
        params.asset = IERC20(_params.asset);
        params.segments = _params.segments;
        params.broker = broker;//Broker(address(this), broker.fee);

        streamId = dynamic.createWithMilestones(params);
        streamManageMents[++_dlStreamId] = StreamManageMent(
            _params.sender,
            _params.recipient,
            1,
            1,
            uint240(streamId)
        );
    }

    // Because the NFT is directly transferred to the recipient, if you claim it through our platform, 
    // you will need to authorize our platform to use your NFT.
    function claim(uint256 dlStreamId, uint128 amount) external {
        StreamManageMent memory _streamManageMents = streamManageMents[
            dlStreamId
        ];
        if(_streamManageMents.category == 0){
            linear.withdraw({
                streamId: _streamManageMents.streamId,
                to: msg.sender,
                amount: amount
            });
        }else{
            dynamic.withdraw({
                streamId: _streamManageMents.streamId,
                to: msg.sender,
                amount: amount
            });
        }
    }

    function cancel(uint256 dlStreamId) external {
        StreamManageMent memory _streamManageMents = streamManageMents[
            dlStreamId
        ];
        
        if(_streamManageMents.category == 0){
            linear.cancel(_streamManageMents.streamId);
        }else{
            dynamic.cancel(_streamManageMents.streamId);
        }
    }
}
