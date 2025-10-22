import { expect } from "chai";
import { ethers } from "hardhat";
import { CeloSender, BaseReceiver, MockMailbox } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * @title CeloToBaseTest
 * @notice Tests for Celo -> Base cross-chain messaging via Hyperlane
 */
describe("CeloToBase Cross-chain Messaging", () => {
  let celoSender: CeloSender;
  let baseReceiver: BaseReceiver;
  let mockCeloMailbox: MockMailbox;
  let mockBaseMailbox: MockMailbox;

  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  const CELO_SEPOLIA_DOMAIN = 11142220;
  const BASE_SEPOLIA_DOMAIN = 84532;

  // Helper function to convert address to bytes32
  function addressToBytes32(address: string): string {
    return ethers.zeroPadValue(address, 32);
  }

  async function deploy() {
    [owner, alice, bob] = await ethers.getSigners();

    // Deploy mock mailboxes
    const MockMailboxFactory = await ethers.getContractFactory("MockMailbox");
    mockCeloMailbox = await MockMailboxFactory.deploy(CELO_SEPOLIA_DOMAIN);
    await mockCeloMailbox.waitForDeployment();

    mockBaseMailbox = await MockMailboxFactory.deploy(BASE_SEPOLIA_DOMAIN);
    await mockBaseMailbox.waitForDeployment();

    // Deploy CeloSender on "Celo Sepolia"
    const CeloSenderFactory = await ethers.getContractFactory("CeloSender");
    celoSender = await CeloSenderFactory.deploy(
      await mockCeloMailbox.getAddress()
    );
    await celoSender.waitForDeployment();

    // Deploy BaseReceiver on "Base Sepolia"
    const BaseReceiverFactory = await ethers.getContractFactory("BaseReceiver");
    baseReceiver = await BaseReceiverFactory.deploy(
      await mockBaseMailbox.getAddress()
    );
    await baseReceiver.waitForDeployment();

    return {
      owner,
      alice,
      bob,
      celoSender,
      baseReceiver,
      mockCeloMailbox,
      mockBaseMailbox,
    };
  }

  describe("CeloSender", () => {
    beforeEach(async () => {
      await deploy();
    });

    describe("Deployment", () => {
      it("should deploy with correct mailbox address", async () => {
        expect(await celoSender.MAILBOX()).to.equal(
          await mockCeloMailbox.getAddress()
        );
      });

      it("should have correct Base Sepolia domain", async () => {
        expect(await celoSender.BASE_SEPOLIA_DOMAIN()).to.equal(
          BASE_SEPOLIA_DOMAIN
        );
      });

      it("should have correct local domain", async () => {
        expect(await celoSender.localDomain()).to.equal(CELO_SEPOLIA_DOMAIN);
      });

      it("should revert on zero address mailbox", async () => {
        const CeloSenderFactory = await ethers.getContractFactory("CeloSender");
        await expect(
          CeloSenderFactory.deploy(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(celoSender, "ZeroAddressMailbox");
      });
    });

    describe("sendToBase", () => {
      it("should send message to Base", async () => {
        const message = ethers.toUtf8Bytes("Hello Base from Celo!");
        const recipient = await baseReceiver.getAddress();

        await expect(celoSender.sendToBase(recipient, message))
          .to.emit(celoSender, "MessageDispatched")
          .withArgs(ethers.toBeHex(1, 32), recipient, message);
      });

      it("should return valid message ID", async () => {
        const message = ethers.toUtf8Bytes("Test message");
        const recipient = await baseReceiver.getAddress();

        const messageId = await celoSender.sendToBase.staticCall(
          recipient,
          message
        );
        expect(messageId).to.equal(ethers.toBeHex(1, 32));
      });

      it("should revert on zero address recipient", async () => {
        const message = ethers.toUtf8Bytes("test");

        await expect(
          celoSender.sendToBase(ethers.ZeroAddress, message)
        ).to.be.revertedWithCustomError(celoSender, "ZeroAddressRecipient");
      });

      it("should revert on empty message", async () => {
        const recipient = await baseReceiver.getAddress();
        const emptyMessage = "0x";

        await expect(
          celoSender.sendToBase(recipient, emptyMessage)
        ).to.be.revertedWithCustomError(celoSender, "EmptyMessage");
      });

      it("should handle multiple messages", async () => {
        const recipient = await baseReceiver.getAddress();

        for (let i = 0; i < 5; i++) {
          const message = ethers.toUtf8Bytes(`Message #${i}`);
          const messageId = await celoSender.sendToBase.staticCall(
            recipient,
            message
          );
          expect(messageId).to.equal(ethers.toBeHex(i + 1, 32));

          await celoSender.sendToBase(recipient, message);
        }

        expect(await mockCeloMailbox.count()).to.equal(5);
      });
    });

    describe("sendStringToBase", () => {
      it("should send string message to Base", async () => {
        const message = "Hello Base!";
        const recipient = await baseReceiver.getAddress();

        const messageId = await celoSender.sendStringToBase.staticCall(
          recipient,
          message
        );
        expect(messageId).to.equal(ethers.toBeHex(1, 32));

        await celoSender.sendStringToBase(recipient, message);
      });

      it("should emit MessageDispatched event", async () => {
        const message = "Test string";
        const recipient = await baseReceiver.getAddress();
        const messageBytes = ethers.toUtf8Bytes(message);

        await expect(celoSender.sendStringToBase(recipient, message))
          .to.emit(celoSender, "MessageDispatched")
          .withArgs(ethers.toBeHex(1, 32), recipient, messageBytes);
      });
    });

    describe("View Functions", () => {
      it("should check if message is delivered", async () => {
        const messageId = ethers.toBeHex(1, 32);
        expect(await celoSender.isDelivered(messageId)).to.be.false;

        await mockCeloMailbox.markDelivered(messageId);
        expect(await celoSender.isDelivered(messageId)).to.be.true;
      });
    });
  });

  describe("BaseReceiver", () => {
    beforeEach(async () => {
      await deploy();
    });

    describe("Deployment", () => {
      it("should deploy with correct mailbox address", async () => {
        expect(await baseReceiver.MAILBOX()).to.equal(
          await mockBaseMailbox.getAddress()
        );
      });

      it("should have correct Celo Sepolia domain", async () => {
        expect(await baseReceiver.CELO_SEPOLIA_DOMAIN()).to.equal(
          CELO_SEPOLIA_DOMAIN
        );
      });

      it("should have correct local domain", async () => {
        expect(await baseReceiver.localDomain()).to.equal(BASE_SEPOLIA_DOMAIN);
      });

      it("should initialize with zero message count", async () => {
        expect(await baseReceiver.messageCount()).to.equal(0);
      });

      it("should not enforce trusted senders by default", async () => {
        expect(await baseReceiver.enforceTrustedSenders()).to.be.false;
      });

      it("should revert on zero address mailbox", async () => {
        const BaseReceiverFactory =
          await ethers.getContractFactory("BaseReceiver");
        await expect(
          BaseReceiverFactory.deploy(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(baseReceiver, "ZeroAddressMailbox");
      });
    });

    describe("handle", () => {
      it("should receive and store message from Celo", async () => {
        const message = ethers.toUtf8Bytes("Hello from Celo!");
        const sender = addressToBytes32(await celoSender.getAddress());

        await expect(
          mockBaseMailbox.deliverMessage(
            await baseReceiver.getAddress(),
            CELO_SEPOLIA_DOMAIN,
            sender,
            message
          )
        )
          .to.emit(baseReceiver, "MessageReceived")
          .withArgs(
            ethers.solidityPackedKeccak256(
              ["uint32", "bytes32", "uint256", "bytes"],
              [CELO_SEPOLIA_DOMAIN, sender, 0, message]
            ),
            CELO_SEPOLIA_DOMAIN,
            sender,
            message
          );

        expect(await baseReceiver.messageCount()).to.equal(1);
      });

      it("should revert when not called by mailbox", async () => {
        const message = ethers.toUtf8Bytes("test");
        const sender = addressToBytes32(alice.address);

        await expect(
          baseReceiver.handle(CELO_SEPOLIA_DOMAIN, sender, message)
        ).to.be.revertedWithCustomError(baseReceiver, "NotMailbox");
      });

      it("should revert on invalid origin", async () => {
        const message = ethers.toUtf8Bytes("test");
        const sender = addressToBytes32(await celoSender.getAddress());
        const wrongOrigin = 12345;

        const mailboxAddress = await mockBaseMailbox.getAddress();

        await expect(
          baseReceiver.connect(alice).handle(wrongOrigin, sender, message)
        ).to.be.revertedWithCustomError(baseReceiver, "NotMailbox");
      });

      it("should handle multiple messages", async () => {
        const sender = addressToBytes32(await celoSender.getAddress());

        for (let i = 0; i < 10; i++) {
          const message = ethers.toUtf8Bytes(`Message #${i}`);
          await mockBaseMailbox.deliverMessage(
            await baseReceiver.getAddress(),
            CELO_SEPOLIA_DOMAIN,
            sender,
            message
          );
        }

        expect(await baseReceiver.messageCount()).to.equal(10);
      });
    });

    describe("Trusted Senders", () => {
      it("should add trusted sender", async () => {
        await baseReceiver.addTrustedSender(alice.address);
        expect(await baseReceiver.isTrustedSender(alice.address)).to.be.true;
      });

      it("should emit TrustedSenderAdded event", async () => {
        await expect(baseReceiver.addTrustedSender(alice.address))
          .to.emit(baseReceiver, "TrustedSenderAdded")
          .withArgs(addressToBytes32(alice.address));
      });

      it("should remove trusted sender", async () => {
        await baseReceiver.addTrustedSender(alice.address);
        expect(await baseReceiver.isTrustedSender(alice.address)).to.be.true;

        await baseReceiver.removeTrustedSender(alice.address);
        expect(await baseReceiver.isTrustedSender(alice.address)).to.be.false;
      });

      it("should enforce trusted senders when enabled", async () => {
        // Add Alice as trusted sender
        await baseReceiver.addTrustedSender(alice.address);

        // Enable enforcement
        await expect(baseReceiver.setTrustedSenderEnforcement(true))
          .to.emit(baseReceiver, "TrustedSenderEnforcementToggled")
          .withArgs(true);

        expect(await baseReceiver.enforceTrustedSenders()).to.be.true;

        // Message from trusted sender (Alice) should work
        const message = ethers.toUtf8Bytes("Trusted message");
        await mockBaseMailbox.deliverMessage(
          await baseReceiver.getAddress(),
          CELO_SEPOLIA_DOMAIN,
          addressToBytes32(alice.address),
          message
        );
        expect(await baseReceiver.messageCount()).to.equal(1);

        // Message from untrusted sender (Bob) should fail
        const bobSender = addressToBytes32(bob.address);
        await expect(
          mockBaseMailbox.deliverMessage(
            await baseReceiver.getAddress(),
            CELO_SEPOLIA_DOMAIN,
            bobSender,
            message
          )
        )
          .to.be.revertedWithCustomError(baseReceiver, "UntrustedSender")
          .withArgs(bobSender);
      });

      it("should handle bytes32 trusted senders", async () => {
        const senderBytes32 = addressToBytes32(alice.address);

        await baseReceiver.addTrustedSenderBytes32(senderBytes32);
        expect(
          await baseReceiver.isTrustedSenderBytes32(senderBytes32)
        ).to.be.true;

        await baseReceiver.removeTrustedSenderBytes32(senderBytes32);
        expect(
          await baseReceiver.isTrustedSenderBytes32(senderBytes32)
        ).to.be.false;
      });
    });

    describe("View Functions", () => {
      it("should get message by ID", async () => {
        const message = ethers.toUtf8Bytes("Test message");
        const sender = addressToBytes32(await celoSender.getAddress());

        await mockBaseMailbox.deliverMessage(
          await baseReceiver.getAddress(),
          CELO_SEPOLIA_DOMAIN,
          sender,
          message
        );

        const messageId = ethers.solidityPackedKeccak256(
          ["uint32", "bytes32", "uint256", "bytes"],
          [CELO_SEPOLIA_DOMAIN, sender, 0, message]
        );

        const receivedMessage = await baseReceiver.getMessage(messageId);
        expect(receivedMessage.origin).to.equal(CELO_SEPOLIA_DOMAIN);
        expect(receivedMessage.sender).to.equal(sender);
        expect(receivedMessage.message).to.equal(ethers.hexlify(message));
        expect(receivedMessage.exists).to.be.true;
      });

      it("should decode message as string", async () => {
        const originalMessage = "Hello Base!";
        const message = ethers.toUtf8Bytes(originalMessage);
        const sender = addressToBytes32(await celoSender.getAddress());

        await mockBaseMailbox.deliverMessage(
          await baseReceiver.getAddress(),
          CELO_SEPOLIA_DOMAIN,
          sender,
          message
        );

        const messageId = ethers.solidityPackedKeccak256(
          ["uint32", "bytes32", "uint256", "bytes"],
          [CELO_SEPOLIA_DOMAIN, sender, 0, message]
        );

        const decoded = await baseReceiver.getMessageAsString(messageId);
        expect(decoded).to.equal(originalMessage);
      });

      it("should get sender address from message", async () => {
        const message = ethers.toUtf8Bytes("test");
        const sender = addressToBytes32(alice.address);

        await mockBaseMailbox.deliverMessage(
          await baseReceiver.getAddress(),
          CELO_SEPOLIA_DOMAIN,
          sender,
          message
        );

        const messageId = ethers.solidityPackedKeccak256(
          ["uint32", "bytes32", "uint256", "bytes"],
          [CELO_SEPOLIA_DOMAIN, sender, 0, message]
        );

        const senderAddress = await baseReceiver.getSenderAddress(messageId);
        expect(senderAddress).to.equal(alice.address);
      });
    });
  });

  describe("Integration: Celo to Base Flow", () => {
    beforeEach(async () => {
      await deploy();
    });

    it("should complete full cross-chain message flow", async () => {
      const message = ethers.toUtf8Bytes("Cross-chain message from Celo to Base");

      // Step 1: Send from Celo
      const messageId = await celoSender.sendToBase.staticCall(
        await baseReceiver.getAddress(),
        message
      );
      expect(messageId).to.equal(ethers.toBeHex(1, 32));

      await celoSender.sendToBase(await baseReceiver.getAddress(), message);

      // Step 2: Simulate Hyperlane delivery to Base
      const sender = addressToBytes32(await celoSender.getAddress());
      await mockBaseMailbox.deliverMessage(
        await baseReceiver.getAddress(),
        CELO_SEPOLIA_DOMAIN,
        sender,
        message
      );

      // Step 3: Verify message received
      expect(await baseReceiver.messageCount()).to.equal(1);

      const receivedMsgId = ethers.solidityPackedKeccak256(
        ["uint32", "bytes32", "uint256", "bytes"],
        [CELO_SEPOLIA_DOMAIN, sender, 0, message]
      );

      const received = await baseReceiver.getMessage(receivedMsgId);
      expect(received.message).to.equal(ethers.hexlify(message));
      expect(received.exists).to.be.true;
    });

    it("should handle multiple sequential messages", async () => {
      const messageCount = 15;

      for (let i = 0; i < messageCount; i++) {
        const message = ethers.toUtf8Bytes(`Message #${i}`);

        // Send from Celo
        await celoSender.sendToBase(await baseReceiver.getAddress(), message);

        // Deliver to Base
        await mockBaseMailbox.deliverMessage(
          await baseReceiver.getAddress(),
          CELO_SEPOLIA_DOMAIN,
          addressToBytes32(await celoSender.getAddress()),
          message
        );
      }

      expect(await baseReceiver.messageCount()).to.equal(messageCount);
      expect(await mockCeloMailbox.count()).to.equal(messageCount);
    });

    it("should handle string messages end-to-end", async () => {
      const message = "Hello from Celo!";

      // Send string message
      await celoSender.sendStringToBase(
        await baseReceiver.getAddress(),
        message
      );

      // Deliver to Base
      const messageBytes = ethers.toUtf8Bytes(message);
      const sender = addressToBytes32(await celoSender.getAddress());

      await mockBaseMailbox.deliverMessage(
        await baseReceiver.getAddress(),
        CELO_SEPOLIA_DOMAIN,
        sender,
        messageBytes
      );

      // Verify can decode as string
      const messageId = ethers.solidityPackedKeccak256(
        ["uint32", "bytes32", "uint256", "bytes"],
        [CELO_SEPOLIA_DOMAIN, sender, 0, messageBytes]
      );

      const decoded = await baseReceiver.getMessageAsString(messageId);
      expect(decoded).to.equal(message);
    });

    it("should verify sender address in cross-chain flow", async () => {
      const message = ethers.toUtf8Bytes("Verify sender test");
      const celoSenderAddress = await celoSender.getAddress();

      // Send from CeloSender contract
      await celoSender.sendToBase(await baseReceiver.getAddress(), message);

      // Deliver to Base
      const sender = addressToBytes32(celoSenderAddress);
      await mockBaseMailbox.deliverMessage(
        await baseReceiver.getAddress(),
        CELO_SEPOLIA_DOMAIN,
        sender,
        message
      );

      // Verify sender can be retrieved
      const messageId = ethers.solidityPackedKeccak256(
        ["uint32", "bytes32", "uint256", "bytes"],
        [CELO_SEPOLIA_DOMAIN, sender, 0, message]
      );

      const retrievedSender = await baseReceiver.getSenderAddress(messageId);
      expect(retrievedSender).to.equal(celoSenderAddress);
    });
  });
});
