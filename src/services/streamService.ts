
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/streams';

export interface StreamRecipient {
    id: string;
    stream_id: string;
    recipient_address: string;
    allocation: number;
    start_time: string;
    end_time: string;
    rate_per_second: number;
    withdrawn_amount: number;
    last_claim_time: string;
    // Joined Stream info
    streams?: {
        name: string;
        token_symbol: string;
        employer_id: string;
    };
}

export interface Stream {
    id: string;
    employer_id: string;
    name: string;
    total_allocation: number;
    remaining_allocation: number;
    token_symbol: string;
    status: 'active' | 'paused' | 'completed' | 'cancelled';
    created_at: string;
    stream_recipients: StreamRecipient[];
}

export const streamService = {
    /**
     * Create a new payroll stream
     */
    createStream: async (userId: string, name: string, recipients: { address: string; amount: number; durationSeconds: number }[], isDemo: boolean = false) => {
        const response = await axios.post(`${API_BASE_URL}/create`, {
            userId,
            data: {
                name,
                tokenSymbol: 'BCH',
                recipients
            },
            isDemo
        });
        return response.data;
    },

    /**
     * Get all streams created by an employer
     */
    getEmployerStreams: async (userId: string) => {
        const response = await axios.get(`${API_BASE_URL}/employer/${userId}`);
        return response.data as Stream[];
    },

    /**
     * Get all streams where the user is a recipient
     */
    getRecipientStreams: async (address: string) => {
        const response = await axios.get(`${API_BASE_URL}/recipient/${address}`);
        return response.data as StreamRecipient[];
    },

    /**
     * Withdraw available funds from a stream
     */
    withdraw: async (recipientId: string, amount?: number) => {
        const response = await axios.post(`${API_BASE_URL}/withdraw`, {
            recipientId,
            amount
        });
        return response.data;
    }
};
