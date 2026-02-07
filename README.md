Here is the comprehensive, copy-paste ready README.md file for your project.🦅 Campus VeritasDecentralized. Anonymous. Verified.A Game-Theoretic approach to solving misinformation on campus without a central moderator.💡 The ProblemOn traditional social media, Popularity = Truth. If a lie gets enough likes, it becomes a fact. Central moderators are biased and slow. Campus Veritas solves this by introducing Reputation-Based Weighted Voting where truth is determined by the credibility of the voters, not just the count.🛡️ Key Features (The Veritas Protocol)1. 👁️ Blind Token Identity (The Air-Gap)We verify student status via email/OTP but issue a completely disconnected UUID. It is mathematically impossible to link a post back to a student's real identity because the system separates the "Identity Service" from the "Activity Ledger".2. ⚖️ Weighted DemocracyOne person does not equal one vote.Freshman (Low Rep): Vote Power = 1.0Senior (High Rep): Vote Power = 1.6+Formula: Vote Power = Reputation * 0.02.3. ⏳ The "Tribunal" PipelineRumors do not go public immediately. They must survive the scrutiny of high-reputation users first.Jitter Phase: Hidden for a random 1-60 minutes to prevent bot coordination.Tribunal Phase: Visible only to Seniors (Rep > 80) for the first 2 hours.The Kill Switch: If 40% of Seniors downvote it, the rumor is rejected immediately.4. 🖱️ Kinetic Bot ResistanceThe "Verify" and "Dispute" buttons physically evade automated click-scripts using randomized DOM motion (+/- 25px on every render).🏗️ Tech StackFrontend (Client)Framework: Next.js 14 (App Router) Styling: Tailwind CSS (Cyberpunk/Dark Mode aesthetic)Animation: Framer Motion (Crucial for the "Wiggling Button" defense) Backend (Server)Runtime: Node.js + Express.js Database: SQLite (File-based veritas.db) ORM: Prisma 🚀 Installation & Setup1. Clone the RepositoryBashgit clone https://github.com/your-username/campus-veritas.git
cd campus-veritas
2. Backend Setup (The Engine)Bashcd server
npm install

# Initialize the Database
npx prisma generate
npx prisma migrate dev --name init

# Seed with Dummy Data (Seniors, Freshmen, Rumors)
npx prisma db seed

# Start the Server (Runs on Port 4000)
node server.js
3. Frontend Setup (The Interface)Open a new terminal window:Bashcd client
npm install

# Start the Client (Runs on Port 3000)
npm run dev
4. Access the AppOpen http://localhost:3000 in your browser.🧠 The Game Theory EconomicsThe system uses a strict set of rules defined in server/constants.js.ActionCost/RewardConditionPost Rumor-5 RepHigh Trust Users (>80 Rep) Post Rumor-10 RepLow Trust Users (Anti-Spam) Vote Correctly+5 RepConsensus Reward Vote Incorrectly-15 RepSlashing Penalty System ConstraintsSettlement Time: 7 Days (or immediately upon 50 votes).Initial Reputation: 50.0.Jitter Delay: Random between 60,000ms and 3,600,000ms.📂 Project StructurePlaintext/campus-veritas
├── /client             # Next.js Frontend
│   ├── /components
│   │   └── FeedCard.js # Contains the "Wiggling" Buttons
│   └── /app
│       └── page.js     # The Main Feed
├── /server             # Express Backend
│   ├── /prisma
│   │   └── schema.prisma # DB Schema (User, Rumor, Vote)
│   ├── /routes
│   │   ├── auth.js     # Blind Token Logic
│   │   └── rumors.js   # Jitter & Tribunal Logic
│   └── server.js       # Entry Point
└── README.md           # You are here
📄 LicenseMIT License. Built for Hackathon 2026.
