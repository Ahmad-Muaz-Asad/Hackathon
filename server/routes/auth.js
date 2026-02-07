import express from 'express';
import { PrismaClient } from '@prisma/client';
import { REP_INITIAL, REP_MAX } from '../constants.js';

const router = express.Router();
const prisma = new PrismaClient();

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate email format: lXXXX@lhr.nu.edu.pk
function validateEmail(email) {
    const regex = /^l\d{4}@lhr\.nu\.edu\.pk$/i;
    return regex.test(email);
}

// Extract roll number from email
function extractRollNo(email) {
    return email.split('@')[0].toLowerCase();
}

// ============================================
// POST /auth/request-otp
// ============================================
router.post('/request-otp', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Validate email format
        if (!validateEmail(email)) {
            return res.status(400).json({
                error: 'Invalid email format. Must be lXXXX@lhr.nu.edu.pk'
            });
        }

        const rollNo = extractRollNo(email);
        const normalizedEmail = email.toLowerCase();

        // Find or create student record
        let student = await prisma.student.findUnique({
            where: { rollNo },
            include: { user: true }
        });

        let isReturningUser = false;
        let requiresPreviousToken = false;
        let tokenFrozen = false;

        if (student) {
            if (student.tokenClaimed && student.user) {
                // Token already claimed
                if (student.user.frozen) {
                    // Frozen token - allow reset flow
                    isReturningUser = true;
                    requiresPreviousToken = true;
                    tokenFrozen = true;
                    console.log(`[AUTH] Frozen user ${rollNo} requesting token reset`);
                } else {
                    // Active token - block
                    return res.status(400).json({
                        error: 'Token already claimed for this roll number',
                        message: 'You already have an active token. If you lost it, wait for semester reset.'
                    });
                }
            }
        } else {
            // Create new student record
            student = await prisma.student.create({
                data: {
                    rollNo,
                    email: normalizedEmail
                }
            });
            console.log(`[AUTH] New student registered: ${rollNo}`);
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Store OTP
        await prisma.student.update({
            where: { rollNo },
            data: { otpCode: otp, otpExpiresAt }
        });

        console.log(`[AUTH] OTP for ${rollNo}: ${otp}`);

        res.json({
            message: 'OTP generated',
            otp: otp,  // DEMO MODE - In production, send via email
            isReturningUser,
            requiresPreviousToken,
            tokenFrozen,
            rollNo
        });

    } catch (error) {
        console.error('[AUTH ERROR]', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// ============================================
// POST /auth/verify-otp
// ============================================
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp, previousToken } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        const rollNo = extractRollNo(email);

        // Find student
        const student = await prisma.student.findUnique({
            where: { rollNo },
            include: { user: true }
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found. Request OTP first.' });
        }

        // Validate OTP
        if (student.otpCode !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // Check OTP expiry
        if (student.otpExpiresAt && new Date() > student.otpExpiresAt) {
            return res.status(400).json({ error: 'OTP expired. Request a new one.' });
        }

        let newUser;
        let isNewUser = true;
        let oldReputation = REP_INITIAL;

        if (student.tokenClaimed && student.user) {
            // Returning user - token reset flow
            isNewUser = false;

            // Validate previous token
            if (!previousToken) {
                return res.status(400).json({
                    error: 'Previous token required',
                    message: 'You must provide your previous token to transfer your reputation.',
                    requiresPreviousToken: true
                });
            }

            if (previousToken !== student.userId) {
                return res.status(400).json({
                    error: 'Invalid previous token',
                    message: 'The token you provided does not match our records.'
                });
            }

            // Transfer reputation from old user
            oldReputation = student.user.reputation;

            // Create new user with transferred reputation
            newUser = await prisma.user.create({
                data: {
                    reputation: oldReputation,
                    frozen: false
                }
            });

            // Update student to link to new user
            await prisma.student.update({
                where: { rollNo },
                data: {
                    userId: newUser.id,
                    otpCode: null,
                    otpExpiresAt: null
                }
            });

            // Mark old user as replaced (optional: could delete)
            await prisma.user.update({
                where: { id: student.userId },
                data: { frozen: true }
            });

            console.log(`[AUTH] Token reset for ${rollNo}: ${student.userId.slice(0, 8)} -> ${newUser.id.slice(0, 8)} (Rep: ${oldReputation})`);

        } else {
            // First-time user
            newUser = await prisma.user.create({
                data: {
                    reputation: REP_INITIAL,
                    frozen: false
                }
            });

            await prisma.student.update({
                where: { rollNo },
                data: {
                    tokenClaimed: true,
                    userId: newUser.id,
                    otpCode: null,
                    otpExpiresAt: null
                }
            });

            console.log(`[AUTH] New token issued for ${rollNo}: ${newUser.id.slice(0, 8)}`);
        }

        res.json({
            message: 'Verification successful',
            token: newUser.id,
            reputation: newUser.reputation,
            isNewUser,
            rollNo
        });

    } catch (error) {
        console.error('[AUTH ERROR]', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

// ============================================
// GET /auth/check-token
// ============================================
router.get('/check-token', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const user = await prisma.user.findUnique({
            where: { id: token },
            include: { student: true }
        });

        if (!user) {
            return res.json({ valid: false, error: 'Token not found' });
        }

        res.json({
            valid: true,
            frozen: user.frozen,
            reputation: user.reputation,
            rollNo: user.student?.rollNo || null
        });

    } catch (error) {
        console.error('[AUTH ERROR]', error);
        res.status(500).json({ error: 'Failed to check token' });
    }
});

// ============================================
// POST /auth/admin/freeze-all (Admin endpoint for demo)
// ============================================
router.post('/admin/freeze-all', async (req, res) => {
    try {
        const result = await prisma.user.updateMany({
            where: { frozen: false },
            data: { frozen: true }
        });

        console.log(`[ADMIN] Froze ${result.count} tokens`);

        res.json({
            message: `Froze ${result.count} tokens`,
            count: result.count
        });

    } catch (error) {
        console.error('[ADMIN ERROR]', error);
        res.status(500).json({ error: 'Failed to freeze tokens' });
    }
});

// ============================================
// POST /auth/admin/unfreeze-all (Admin endpoint for demo)
// ============================================
router.post('/admin/unfreeze-all', async (req, res) => {
    try {
        const result = await prisma.user.updateMany({
            where: { frozen: true },
            data: { frozen: false }
        });

        console.log(`[ADMIN] Unfroze ${result.count} tokens`);

        res.json({
            message: `Unfroze ${result.count} tokens`,
            count: result.count
        });

    } catch (error) {
        console.error('[ADMIN ERROR]', error);
        res.status(500).json({ error: 'Failed to unfreeze tokens' });
    }
});

export default router;
