// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IReserveVault {
    enum Policy {
        PER_SESSION,
        TIME_ACCESS
    }
    enum AgreementState {
        NONE,
        OPEN,
        TERMINATED
    }
    enum ClaimState {
        NONE,
        PROPOSED,
        CONFIRMED,
        CHALLENGED,
        FINALIZED,
        RESOLVED,
        CANCELLED
    }
    enum TerminationState {
        NONE,
        PROPOSED,
        DISPUTED,
        ACCEPTED,
        RESOLVED,
        CANCELLED
    }

    struct Agreement {
        address buyer;
        address merchant;
        Policy policy;
        AgreementState state;
        bytes32 termsHash;
        uint64 startAt;
        uint64 endAt;
        uint64 challengeWindow;
        uint256 challengedSessionClaimId;
        uint8 sessionsFinalized;
        uint8 positiveRefundSlots;
        uint8 sessionsConsumed;
        uint256 liveClaims;
        uint256 deposited;
        uint256 earnedFinalized;
        uint256 gymWithdrawn;
        uint256 refundAuthorized;
        uint256 buyerRefunded;
        uint256 disputedLocked;
    }

    struct Claim {
        ClaimState state;
        bytes32 sessionId;
        bytes32 evidenceHash;
        uint8 settledSessionSlot;
        uint8 reservedGymSlot;
        uint8 reservedRefundSlot;
        uint256 reservedGymAmount;
        uint256 reservedRefundAmount;
        uint64 from;
        uint64 to;
        uint64 proposedAt;
        uint64 challengeEndsAt;
        uint256 amount;
        uint256 awardedToGym;
        uint256 awardedToBuyer;
    }

    struct Termination {
        TerminationState state;
        address proposer;
        uint256 proposedRefund;
        bytes32 evidenceHash;
    }

    event AgreementOpened(
        uint256 indexed agreementId,
        address indexed buyer,
        address indexed merchant,
        Policy policy,
        uint256 amount,
        bytes32 termsHash,
        uint64 startAt,
        uint64 endAt,
        uint64 challengeWindow
    );
    event ClaimProposed(
        uint256 indexed agreementId,
        uint256 indexed claimId,
        bytes32 indexed sessionId,
        bytes32 evidenceHash,
        uint64 from,
        uint64 to,
        uint64 proposedAt,
        uint64 challengeEndsAt,
        uint256 amount
    );
    event SessionProposalCancelled(
        uint256 indexed agreementId, uint256 indexed claimId, bytes32 indexed sessionId, address cancelledBy
    );
    event SessionConfirmed(uint256 indexed agreementId, uint256 indexed claimId);
    event ClaimChallenged(uint256 indexed agreementId, uint256 indexed claimId, bytes32 evidenceHash);
    event ClaimFinalized(uint256 indexed agreementId, uint256 indexed claimId, uint256 amount);
    event ClaimResolved(
        uint256 indexed agreementId,
        uint256 indexed claimId,
        bytes32 indexed sessionId,
        uint256 gymAmount,
        uint256 buyerAmount,
        uint8 retiredSessionSlot,
        bytes32 decisionHash
    );
    event TerminationProposed(
        uint256 indexed agreementId,
        uint256 indexed proposalId,
        address indexed proposer,
        uint256 proposedRefund,
        bytes32 evidenceHash
    );
    event TerminationDisputed(uint256 indexed agreementId, uint256 indexed proposalId, bytes32 evidenceHash);
    event TerminationCancelled(uint256 indexed agreementId, uint256 indexed proposalId);
    event AgreementTerminated(
        uint256 indexed agreementId,
        uint256 indexed proposalId,
        address indexed decidedBy,
        bool viaResolver,
        uint256 refundAmount,
        bytes32 decisionHash
    );
    event TerminationRefundAuthorized(
        uint256 indexed agreementId,
        uint256 indexed proposalId,
        address indexed decidedBy,
        bool viaResolver,
        uint256 refundAmount,
        bytes32 decisionHash
    );
    event EarnedClaimed(uint256 indexed agreementId, address indexed merchant, uint256 amount);
    event RefundClaimed(uint256 indexed agreementId, address indexed buyer, uint256 amount);

    error Unauthorized();
    error NotFound();
    error InvalidState();
    error InvalidInput();
    error InvalidInterval();
    error InvalidTermsHash();
    error InvalidTimeProfile();
    error SessionAllocationHeld();
    error DuplicateSession();
    error OverlappingInterval();
    error SessionLimit();
    error ChallengeWindowOpen();
    error ChallengeWindowClosed();
    error LiveClaims();
    error InsufficientUnallocated();
    error NothingToClaim();
    error UnexpectedTokenReceipt();

    function token() external view returns (address);
    function resolver() external view returns (address);
    function timeAccessConfig() external view returns (uint64 duration, uint64 challengeWindow, bytes32 termsHash);
    function openAgreement(
        address merchant,
        Policy policy,
        uint256 amount,
        bytes32 termsHash,
        uint64 startAt,
        uint64 endAt,
        uint64 challengeWindow
    ) external returns (uint256 agreementId);
    function proposeSession(uint256 agreementId, bytes32 sessionId, bytes32 evidenceHash)
        external
        returns (uint256 claimId);
    function cancelSessionProposal(uint256 agreementId, uint256 claimId) external;
    function confirmSession(uint256 agreementId, uint256 claimId) external;
    function proposeTime(uint256 agreementId, uint64 from, uint64 to, bytes32 evidenceHash)
        external
        returns (uint256 claimId);
    function challengeClaim(uint256 agreementId, uint256 claimId, bytes32 evidenceHash) external;
    function finalizeClaim(uint256 agreementId, uint256 claimId) external;
    function resolveClaim(
        uint256 agreementId,
        uint256 claimId,
        uint256 gymAmount,
        uint256 buyerAmount,
        bytes32 decisionHash
    ) external;
    function proposeTermination(uint256 agreementId, uint256 proposedRefund, bytes32 evidenceHash)
        external
        returns (uint256 proposalId);
    function disputeTermination(uint256 agreementId, uint256 proposalId, bytes32 evidenceHash) external;
    function cancelTermination(uint256 agreementId, uint256 proposalId) external;
    function acceptTermination(uint256 agreementId, uint256 proposalId) external;
    function resolveTermination(uint256 agreementId, uint256 proposalId, uint256 refundAmount, bytes32 decisionHash)
        external;
    function claimEarned(uint256 agreementId) external returns (uint256 amount);
    function claimRefund(uint256 agreementId) external returns (uint256 amount);
    function getAgreement(uint256 agreementId) external view returns (Agreement memory);
    function getClaim(uint256 agreementId, uint256 claimId) external view returns (Claim memory);
    function getTermination(uint256 agreementId, uint256 proposalId) external view returns (Termination memory);
    function getActiveTerminationId(uint256 agreementId) external view returns (uint256);
    function getBalances(uint256 agreementId)
        external
        view
        returns (
            uint256 remainingLocked,
            uint256 withdrawable,
            uint256 refundable,
            uint256 disputedLocked,
            uint256 unallocated
        );
}
