
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    // 1. Load Environment Variables manually
    const envPath = path.resolve(__dirname, '../.env');
    if (!fs.existsSync(envPath)) {
        console.error(`Error: .env file not found at ${envPath}`);
        process.exit(1);
    }

    const envConfig = fs.readFileSync(envPath, 'utf8');
    const env: Record<string, string> = {};
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.trim();
        }
    });

    const supabaseUrl = env['SUPABASE_URL'];
    const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
        process.exit(1);
    }

    console.log(`Connecting to Supabase: ${supabaseUrl}`);
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 2. List all users
    console.log('Fetching users...');
    const { data: { users }, error } = await admin.auth.admin.listUsers();

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log(`Found ${users.length} users.`);

    // 3. Update Balances
    let updated = 0;
    let created = 0;
    let errors = 0;

    for (const user of users) {
        try {
            console.log(`Processing user: ${user.id} (${user.email})`);

            const { data: balance } = await admin
                .from('balances')
                .select('*')
                .eq('user_id', user.id)
                .eq('token_symbol', 'BCH')
                .eq('is_demo', false)
                .single();

            if (balance) {
                console.log(`  Existing balance: ${balance.available}. Adding 10...`);
                const { error: updateError } = await admin
                    .from('balances')
                    .update({
                        available: balance.available + 10,
                        updated_at: new Date()
                    })
                    .eq('id', balance.id);

                if (updateError) throw updateError;
                updated++;
            } else {
                console.log(`  No balance found. Creating with 10...`);
                const { error: insertError } = await admin
                    .from('balances')
                    .insert({
                        user_id: user.id,
                        token_symbol: 'BCH',
                        available: 10,
                        locked: 0,
                        is_demo: false
                    });

                if (insertError) throw insertError;
                created++;
            }
        } catch (e) {
            console.error(`  Failed for user ${user.id}:`, e.message);
            errors++;
        }
    }

    console.log(`\nDone!`);
    console.log(`Updated: ${updated}`);
    console.log(`Created: ${created}`);
    console.log(`Errors: ${errors}`);
}

main();
