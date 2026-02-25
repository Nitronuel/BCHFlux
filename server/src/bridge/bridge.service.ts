import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class BridgeService {
    private readonly logger = new Logger(BridgeService.name);
    // Verified Public Rango Key
    private readonly RANGO_API_KEY = process.env.RANGO_API_KEY || 'c6381a79-2817-4602-83bf-6a641a409e32';
    // Verified Base URL
    private readonly BASE_URL = 'https://api.rango.exchange';

    // Token Address Map for Demo (since Rango requires addresses for non-native tokens)
    private readonly TOKEN_MAP: { [key: string]: string } = {
        'SOLANA.PEPE': 'F9CpWoyeBJfoRB8f2pBe2ZNPbPsEE76mWZWme3StsvHK',
        'SOLANA.USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC-SPL
        'ETH.PEPE': '0x6982508145454ce325ddbe47a25d4ec3d2311933',      // PEPE-ERC20
        'ETH.USDC': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',      // USDC-ERC20
        'BSC.BNB': '', // Native
        'ETH.ETH': '', // Native
        'SOLANA.SOL': '', // Native
    };

    /**
     * Get a quote for swapping BCH -> Token
     */
    async getQuote(fromAmount: number, toToken: string, toChain: string, isDemo: boolean = false) {
        this.logger.log(`Getting quote from Rango: ${fromAmount} BCH -> ${toToken} (${toChain}) [isDemo: ${isDemo}]`);

        try {
            const fromBlockchain = 'BCH';
            const fromSymbol = 'BCH';
            const toBlockchain = toChain;
            const toSymbol = toToken;

            // Resolve Token Address
            const tokenKey = `${toChain}.${toToken}`;
            const tokenAddress = this.TOKEN_MAP[tokenKey] || null;

            // Dummy wallets for routing quote check (Rango requires these to validate route)
            const dummyBCH = 'qqtnmek6jddmh4f3gtzxzsgy2flxs5syhuw8062hft'; // Standard CashAddr without bitcoincash:
            const dummyDest = toChain === 'SOLANA' ? '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' : '0x1234567890123456789012345678901234567890';

            const requestBody = {
                from: { blockchain: fromBlockchain, symbol: fromSymbol, address: null },
                to: {
                    blockchain: toBlockchain,
                    symbol: toSymbol,
                    address: tokenAddress // Pass address if known (Required for Tokens)
                },
                amount: fromAmount.toString(),
                slippage: 3.0, // 3% slippage tolerance
                checkPrerequisites: false,
                selectedWallets: {
                    [fromBlockchain]: dummyBCH,
                    [toBlockchain]: dummyDest
                },
                connectedWallets: [
                    { blockchain: fromBlockchain, addresses: [dummyBCH] },
                    { blockchain: toBlockchain, addresses: [dummyDest] }
                ]
            };

            // 2. Call Rango API
            this.logger.log(`Sending Rango Request to ${this.BASE_URL}/routing/best`);
            const response = await axios.post(`${this.BASE_URL}/routing/best`, requestBody, {
                headers: { 'x-api-key': this.RANGO_API_KEY }
            });

            const data = response.data;

            if (!data || !data.result || !data.result.outputAmount) {
                this.logger.warn('Rango returned no route (upstream limitation), falling back to mock quote.');
                throw new Error('No route found for this swap.');
            }

            const route = data.result;
            this.logger.log(`Rango Route Found: ${route.outputAmount} ${toToken} via ${route.swaps?.[0]?.swapperId} `);

            // Return the initial quote data, including the requestId needed for create-transaction
            return {
                quoteId: data.requestId, // VERY IMPORTANT for the next step, use data.requestId not route.requestId
                from: 'BCH',
                to: toToken,
                amountIn: fromAmount,
                amountOut: parseFloat(route.outputAmount),
                bridgeFee: route.fee ? parseFloat(route.fee.amount) : 0.0001,
            };

        } catch (error) {
            this.logger.error('Rango API Failed or No Route:', error.response?.data || error.message);

            if (isDemo) {
                this.logger.warn('Falling back to mock quote due to API failure in Demo Mode.');
                return this.getMockQuote(fromAmount, toToken, toChain);
            } else {
                this.logger.error('Live mode: Failing explicitly as no route is available.');
                throw new HttpException(
                    error.message || 'Cross-chain bridging for this asset is temporarily unavailable upstream.',
                    HttpStatus.SERVICE_UNAVAILABLE
                );
            }
        }
    }

    /**
     * Step 2: Create Transaction
     * Takes the requestId from the quote and the user's destination address to get the actual tx payload.
     */
    async createTransaction(requestId: string, userWalletAddress: string, isDemo: boolean = false) {
        this.logger.log(`Creating Rango Transaction for request: ${requestId}, dest: ${userWalletAddress} [isDemo: ${isDemo}]`);

        try {
            // Prevent attempting to call Rango API with our fallback mock quote ID
            if (requestId && requestId.startsWith('mock-')) {
                this.logger.warn("Mock quote ID detected. Bypassing Rango API for transaction creation.");
                return this.getMockTransaction();
            }

            // Using dummy source to match Quote requirements
            const dummyBCH = 'qqtnmek6jddmh4f3gtzxzsgy2flxs5syhuw8062hft';

            const requestBody = {
                requestId: requestId,
                step: 1,
                userSettings: {
                    slippage: "3.0"
                },
                validations: {
                    balance: "false",
                    fee: "false",
                    approve: "false"
                },
                wallets: [
                    { blockchain: "BCH", address: dummyBCH },
                    // Rango usually infers the destination chain from the quote, just pass the address:
                    { blockchain: "SOLANA", address: userWalletAddress }, // Hacky but Rango accepts it if we just provide wallets array
                    { blockchain: "ETH", address: userWalletAddress },
                    { blockchain: "BSC", address: userWalletAddress }
                ],
                // Rango v2 api might prefer destinationWallets explicitly for multi-routing
                destinationWallets: [
                    {
                        address: userWalletAddress,
                    }
                ]
            };

            const response = await axios.post(`${this.BASE_URL}/tx/create`, requestBody, {
                headers: { 'x-api-key': this.RANGO_API_KEY }
            });

            const data = response.data;

            if (!data || !data.ok || !data.transaction) {
                this.logger.error('Rango create-transaction failed:', JSON.stringify(data));
                throw new Error('Failed to create transaction payload.');
            }

            // Extract the transaction details
            const txDetails = data.transaction;

            if (txDetails.type !== 'TRANSFER') {
                this.logger.warn(`Unexpected Rango TX Type: ${txDetails.type}. Expected TRANSFER for BCH.`);
            }

            return {
                to: txDetails.to,
                value: txDetails.amount || txDetails.value || 0,
                memo: txDetails.memo,
                opReturn: {
                    data: [txDetails.memo]
                },
                raw: txDetails
            };

        } catch (error) {
            this.logger.error('Rango create-transaction failed:', error.response?.data || error.message);

            if (isDemo) {
                this.logger.warn('Falling back to mock TX if API fails in Demo mode.');
                return this.getMockTransaction();
            } else {
                throw new HttpException(
                    'Failed to generate cross-chain transaction payload. Please try again later.',
                    HttpStatus.SERVICE_UNAVAILABLE
                );
            }
        }
    }

    /**
     * Fallback Mock Quote
     */
    private getMockQuote(fromAmount: number, toToken: string, toChain: string) {
        const rates: { [key: string]: number } = {
            'PEPE': 416666666,
            'SOL': 3.5,
            'ETH': 0.15,
            'USDC': 500,
            'BNB': 0.85,
        };
        const rate = rates[toToken] || 100;
        const estimatedOutput = fromAmount * rate;

        return {
            quoteId: `mock-fallback-${Date.now()}`,
            from: 'BCH',
            to: toToken,
            amountIn: fromAmount,
            amountOut: estimatedOutput,
            bridgeFee: 0.0001,
        };
    }

    /**
     * Fallback Mock Transaction
     */
    private getMockTransaction() {
        const memo = `MOCK:RANGO:DEST_ADDR`;
        const bridgeAddress = 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a';

        return {
            to: bridgeAddress,
            value: 0, // Mock, frontend knows amount
            memo: memo,
            opReturn: { data: [memo] }
        };
    }

    /**
     * Status check (mocked for now, can implement Rango status later)
     */
    async getStatus(txId: string) {
        return {
            status: 'BRIDGE_SUCCESS',
            txId: txId,
            step: 'COMPLETED'
        };
    }
}


