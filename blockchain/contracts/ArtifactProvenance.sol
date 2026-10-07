// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Compact, immutable evidence for an off-chain AI artifact. The bytes are never stored here.
contract ArtifactProvenance {
    struct Artifact { bytes32 fingerprint; string artifactType; string version; uint256 registeredAt; string metadataUri; address registrant; }
    mapping(bytes32 => Artifact) private artifacts;
    mapping(bytes32 => bool) private exists;
    event ArtifactRegistered(bytes32 indexed artifactId, bytes32 indexed fingerprint, address indexed registrant, string artifactType, string version, string metadataUri, uint256 timestamp);

    function registerArtifact(bytes32 artifactId, bytes32 fingerprint, string calldata artifactType, string calldata version, string calldata metadataUri) external {
        require(artifactId != bytes32(0), "artifact ID required"); require(fingerprint != bytes32(0), "fingerprint required"); require(bytes(artifactType).length > 0, "artifact type required"); require(bytes(version).length > 0, "version required"); require(!exists[artifactId], "artifact already registered");
        artifacts[artifactId] = Artifact(fingerprint, artifactType, version, block.timestamp, metadataUri, msg.sender); exists[artifactId] = true;
        emit ArtifactRegistered(artifactId, fingerprint, msg.sender, artifactType, version, metadataUri, block.timestamp);
    }
    function artifactExists(bytes32 artifactId) external view returns (bool) { return exists[artifactId]; }
    function getArtifact(bytes32 artifactId) external view returns (Artifact memory) { require(exists[artifactId], "artifact not found"); return artifacts[artifactId]; }
}
