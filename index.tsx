/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from "@google/genai";
import { auth, db } from "./supabase";

// --- TYPES AND INTERFACES ---
interface Business {
    id: string;
    token: string;
    businessName: string;
    ownerName: string;
    email: string;
    phone: string;
    password: string;
    logo?: string;
    auth_user_id?: string; // Add this for Supabase auth integration
}

type UserRole = 'Admin' | 'Entry Agent';
type Category = 'Recharge' | 'Freeplay' | 'Redeem';
type Platform = string; // Changed from union to string
type PageName = string; // Changed from union to string
type Source = 'Referral' | 'Ads' | 'Random';
type ReferralCode = 'FR2K' | 'FR3L' | 'UM303' | 'HM303' | 'BN303' | 'AS303' | 'JF303' | 'HA303' | 'MZ303' | 'SH303' | '2218' | '786' | 'TP303' | 'AL303' | 'PT303' | 'ADS' | 'Random';
type RedeemType = 'Already Paid' | 'New Paid';
type PaymentMethod = string; // Changed from union to string
type PlayerHistory = string; // Changed from union to string

interface Entry {
    id: number;
    businessId: string;
    date: string;
    agentName: string;
    category: Category;
    pageName: PageName;
    username: string;
    amount: number;
    pointsLoad: number;
    platform: Platform;
    source: Source;
    referralCode: ReferralCode;
    redeemType: RedeemType;
    paymentMethod: PaymentMethod;
    playerHistory: PlayerHistory;
}

type AgentAccessRole = 'Viewer' | 'Editor' | 'Full Access';

interface ManagedAgent {
    id: string;
    businessId: string;
    agentName: string;
    username: string;
    password?: string; // Should not be sent to client after creation
    role: AgentAccessRole;
    status: 'active' | 'inactive';
}

type Page = 'home' | 'login' | 'registerBusiness' | 'roleSelection' | 'submit' | 'daily' | 'monthly' | 'referral' | 'progress' | 'upload' | 'settings' | 'manageAgents';

// New data structure for the agent breakdown modal
type AgentPageBreakdown = {
    agentName: string;
    breakdown: { pageName: PageName; totalRecharge: number }[];
}

// New data structure for agent platform breakdown
type AgentPlatformBreakdown = {
    agentName: string;
    breakdown: { platform: Platform; rechargeCount: number }[];
}

// New data structure for agent referral breakdown
type AgentReferralBreakdown = {
    agentName: string;
    breakdown: { referralCode: ReferralCode; playerCount: number; totalRecharge: number }[];
}

// New data type for settings modals
type SettingModalData = {
    key: keyof AppState['settings'];
    singularName: string;
    index?: number;
    currentValue?: string;
};

type ModalState = {
    type: 'edit' | 'delete' | 'deleteAllMonthly' | 'agentPageBreakdown' | 'agentPlatformBreakdown' | 'agentReferralBreakdown' | 'addSetting' | 'editSetting' | 'deleteSetting' | 'editAgent' | 'deleteAgent' | 'resetAgentPassword' | 'agentPassword' | null;
    data?: Entry | number | string | AgentPageBreakdown | AgentPlatformBreakdown | AgentReferralBreakdown | SettingModalData | ManagedAgent | null;
}

type ProgressFilterType = '7days' | '15days' | 'month' | 'custom';

interface AppState {
    role: UserRole | null;
    currentUser: string | null;
    currentBusiness: Business | null;
    currentPage: Page;
    businesses: Business[];
    managedAgents: ManagedAgent[];
    entries: Entry[];
    isLoadingAi: boolean;
    aiInsights: Record<Page, string | null>;
    modal: ModalState;
    isAuthenticated: boolean;
    authUser: any | null;
    settings: {
        pageNames: string[];
        platforms: string[];
        paymentMethods: string[];
        playerHistories: string[];
    };
    filters: {
        daily: {
            agent: string;
            platform: string;
            date: string;
            pageName: string;
            paymentMethod: string;
            category: string;
        };
        monthly: { month: string; currentPage: number; rowsPerPage: number; };
        referral: {
            code: ReferralCode;
            compareCode: ReferralCode | '';
            startDate: string;
            endDate: string;
            currentPage: number;
            rowsPerPage: number;
        };
        progress: {
            filterType: ProgressFilterType;
            startDate: string;
            endDate: string;
        }
    };
}

// --- CONSTANTS AND MOCK DATA ---
// Initialize AI only if API key is available
const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;
const root = document.getElementById('root')!;

const CATEGORIES: Category[] = ['Recharge', 'Freeplay', 'Redeem'];
const PAGE_NAMES_CONST: PageName[] = ['Gaming Slots', 'Orion Era', 'Jeetwin', 'BetHub', 'Nolimit Slots', 'CashDock'];
const PLATFORMS_CONST: Platform[] = ['Orion Star', 'Juwa', 'FireKirin', 'Gamevault', 'Ultra Panda', 'Cash Machine', 'Bigwinner', 'Dragon Dynasty', 'VB Link', 'Game Room', 'River Sweep', 'Moolah', 'Yolo', 'Panda Master', 'Mafia City', 'Cameroom', 'Milkyway', 'Random'];
const SOURCES: Source[] = ['Referral', 'Ads', 'Random'];
const REFERRAL_CODES: ReferralCode[] = ['FR2K', 'FR3L', 'UM303', 'HM303', 'BN303', 'AS303', 'JF303', 'HA303', 'MZ303', 'SH303', '2218', '786', 'TP303', 'AL303', 'PT303', 'ADS', 'Random'];
const REDEEM_TYPES: RedeemType[] = ['Already Paid', 'New Paid'];
const PAYMENT_METHODS_CONST: PaymentMethod[] = ['Chime', 'CashApp', 'Apple Pay', 'PayPal'];
const PLAYER_HISTORIES_CONST: PlayerHistory[] = ['Already Paid', 'New Paid', 'New Freeplay', 'Null'];
const MOCK_AGENTS_CONST = ['ahsan', 'hassan', 'umer', 'ali', 'zara'];
const AGENT_ACCESS_ROLES: AgentAccessRole[] = ['Viewer', 'Editor', 'Full Access'];

const MOCK_BUSINESS: Business = {
    id: 'biz_epic_123',
    token: 'token_epic_123',
    businessName: 'Epic Gaming Inc.',
    ownerName: 'Jane Doe',
    email: 'test@test.com',
    phone: '(555) 123-4567',
    password: 'password',
    logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTIxLDNIM3YxOGgxOHYtMTh6IE0xMSwxdjJoMnYtMmgtMnptMiw0aC0ydjJoMnYtMnptMiw0aC0ydjJoMnYtMnptMiw0aC0ydjJoMnYtMnptLTIsNGgtMnYyaDJ2LTR6bS0yLDJoLTJ2LTJoMnYyem0tMiwyaC0ydi0yaDJ2MnptLTIsMmgtMnYtMmgydjJ6bS0yLDRoMnYtMmgtMnYyem0tMi0yaDJ2LTJoLTJ2MnptLTItMmgydi0yaC0ydjJ6bS0yLTJoMnYtMmgtMnYyeiIvPjwvc3ZnPg==',
};

const MOCK_MANAGED_AGENTS: ManagedAgent[] = MOCK_AGENTS_CONST.map((name, i) => ({
    id: `agent_${Date.now()}_${i}`,
    businessId: MOCK_BUSINESS.id,
    agentName: name,
    username: `${name}@branhox.com`,
    password: 'password123',
    role: AGENT_ACCESS_ROLES[i % AGENT_ACCESS_ROLES.length],
    status: i < MOCK_AGENTS_CONST.length - 1 ? 'active' : 'inactive',
}));

const MOCK_DATA: Entry[] = Array.from({ length: 250 }, (_, i) => {
    const agent = MOCK_AGENTS_CONST[i % MOCK_AGENTS_CONST.length];
    const category = Math.random() > 0.3 ? 'Recharge' : 'Freeplay';
    const amount = category === 'Recharge' ? Math.floor(Math.random() * 150) + 10 : 0;
    const date = new Date(Date.now() - Math.floor(Math.random() * 90) * 86400000); // last 90 days
    return {
        id: i + 1,
        businessId: MOCK_BUSINESS.id,
        date: date.toISOString().split('T')[0],
        agentName: agent,
        category: category,
        pageName: PAGE_NAMES_CONST[i % PAGE_NAMES_CONST.length],
        username: `player${i + 101}`,
        amount: amount,
        pointsLoad: amount > 0 ? amount * (Math.random() * 50 + 80) : Math.floor(Math.random() * 5000) + 1000,
        platform: PLATFORMS_CONST[i % PLATFORMS_CONST.length],
        source: SOURCES[i % SOURCES.length],
        referralCode: REFERRAL_CODES[i % REFERRAL_CODES.length],
        redeemType: category === 'Recharge' ? (Math.random() > 0.5 ? 'New Paid' : 'Already Paid') : REDEEM_TYPES[0],
        paymentMethod: category === 'Recharge' ? PAYMENT_METHODS_CONST[i % PAYMENT_METHODS_CONST.length] : PAYMENT_METHODS_CONST[0],
        playerHistory: PLAYER_HISTORIES_CONST[i % PLAYER_HISTORIES_CONST.length],
    };
});

const dates = MOCK_DATA.map(e => new Date(e.date).getTime());
const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
const today = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
const todayStr = today.toISOString().split('T')[0];

const APP_STATE: AppState = {
    role: null,
    currentUser: null,
    currentBusiness: null,
    currentPage: 'home',
    businesses: [MOCK_BUSINESS],
    managedAgents: MOCK_MANAGED_AGENTS,
    entries: MOCK_DATA.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    isLoadingAi: false,
    aiInsights: { home: null, login: null, registerBusiness: null, roleSelection: null, submit: null, daily: null, monthly: null, referral: null, progress: null, upload: null, settings: null, manageAgents: null },
    modal: { type: null, data: null },
    isAuthenticated: false,
    authUser: null,
    settings: {
        pageNames: [...PAGE_NAMES_CONST],
        platforms: [...PLATFORMS_CONST],
        paymentMethods: [...PAYMENT_METHODS_CONST],
        playerHistories: [...PLAYER_HISTORIES_CONST],
    },
    filters: {
        daily: {
            agent: '',
            platform: '',
            date: todayStr,
            pageName: '',
            paymentMethod: '',
            category: '',
        },
        monthly: {
            month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
            currentPage: 1,
            rowsPerPage: 10,
        },
        referral: {
            code: 'FR2K',
            compareCode: '',
            startDate: minDate,
            endDate: maxDate,
            currentPage: 1,
            rowsPerPage: 10,
        },
        progress: { filterType: 'month', startDate: startOfMonth, endDate: todayStr }
    },
};

// --- HELPER FUNCTIONS ---
const formatDate = (dateString: string) => new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
const createOption = (val: string, selectedVal?: string) => `<option value="${val}" ${val === selectedVal ? 'selected' : ''}>${val}</option>`;

// --- STATE MANAGEMENT ---
function setState(newState: Partial<AppState>) {
    Object.assign(APP_STATE, newState);
    render();
}

function navigateTo(page: Page) {
    // Reset AI insight for the new page if it's not already loading
    if (APP_STATE.aiInsights[page] && !APP_STATE.isLoadingAi) {
         setState({ currentPage: page });
    } else {
         setState({ currentPage: page, aiInsights: { ...APP_STATE.aiInsights, [page]: null } });
    }
}

async function handleBusinessLogin(email: string, password: string): Promise<void> {
    try {
        const { data, error } = await auth.signIn(email, password)
        
        if (error) {
            showAlert(`Login failed: ${error.message}`, 'error')
            return
        }

        if (data.user) {
            // Get business data from database
            const { data: businessData, error: businessError } = await db.getBusinessByEmail(email)

            if (businessError || !businessData) {
                showAlert('Business account not found. Please register first.', 'error')
                return
            }

            setState({
                currentBusiness: businessData,
                currentPage: 'roleSelection',
                role: null,
                currentUser: null,
                isAuthenticated: true,
                authUser: data.user
            })
            showAlert(`Welcome, ${businessData.business_name}!`, 'success')
        }
    } catch (error) {
        console.error('Login error:', error)
        showAlert('Login failed. Please try again.', 'error')
    }
}

function login(role: UserRole, agentName: string) {
    const defaultPage = role === 'Admin' ? 'daily' : 'submit';
    setState({ role, currentUser: agentName, currentPage: defaultPage });
}

async function logout() {
    try {
        // Sign out from Supabase
        const { error } = await auth.signOut()
        if (error) {
            console.error('Logout error:', error)
        }
        
        // Clear local state
        setState({
            role: null,
            currentUser: null,
            currentBusiness: null,
            currentPage: 'home',
            isAuthenticated: false,
            authUser: null
        })
        
        showAlert('Logged out successfully', 'success')
    } catch (error) {
        console.error('Logout error:', error)
        // Still clear local state even if Supabase logout fails
        setState({
            role: null,
            currentUser: null,
            currentBusiness: null,
            currentPage: 'home',
            isAuthenticated: false,
            authUser: null
        })
    }
}


function showAlert(message: string, type: 'success' | 'error' = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${message}`;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 4000);
}

function handleFilterChange(page: keyof AppState['filters'], filterName: string, value: string | number) {
    const newFilters = { ...APP_STATE.filters };

    if (page === 'daily') {
        newFilters.daily = {
            ...APP_STATE.filters.daily,
            [filterName]: value,
        };
    } else if (page === 'monthly') {
        const updatedMonthlyFilters: AppState['filters']['monthly'] = {
            ...APP_STATE.filters.monthly,
        };

        if (filterName === 'month') {
            updatedMonthlyFilters.month = String(value);
            updatedMonthlyFilters.currentPage = 1; // Reset page on month change
        } else if (filterName === 'rowsPerPage') {
            updatedMonthlyFilters.rowsPerPage = Number(value);
            updatedMonthlyFilters.currentPage = 1; // Reset page on row count change
        } else if (filterName === 'currentPage') {
            updatedMonthlyFilters.currentPage = Number(value);
        }

        newFilters.monthly = updatedMonthlyFilters;
    } else if (page === 'referral') {
        const updatedReferralFilters: AppState['filters']['referral'] = {
            ...APP_STATE.filters.referral,
        };

        const mainFilters = ['code', 'compareCode', 'startDate', 'endDate'];

        if (mainFilters.includes(filterName)) {
            (updatedReferralFilters as any)[filterName] = String(value);
            updatedReferralFilters.currentPage = 1;
        } else if (filterName === 'rowsPerPage') {
            updatedReferralFilters.rowsPerPage = Number(value);
            updatedReferralFilters.currentPage = 1;
        } else if (filterName === 'currentPage') {
            updatedReferralFilters.currentPage = Number(value);
        }

        // For referral page, if selected code is same as compare code, reset compare code
        if (filterName === 'code' && value === updatedReferralFilters.compareCode) {
            updatedReferralFilters.compareCode = '';
        }
        if (filterName === 'compareCode' && value === updatedReferralFilters.code) {
            updatedReferralFilters.compareCode = '';
        }
        newFilters.referral = updatedReferralFilters;
    }

    setState({ filters: newFilters });
}


// --- DATA ACTIONS ---

async function handleBusinessRegistration(businessData: Omit<Business, 'id' | 'token'>): Promise<void> {
    try {
        // First, create the user account in Supabase Auth
        const { data: authData, error: authError } = await auth.signUp(
            businessData.email, 
            businessData.password,
            {
                business_name: businessData.businessName,
                owner_name: businessData.ownerName
            }
        )

        if (authError) {
            showAlert(`Registration failed: ${authError.message}`, 'error')
            return
        }

        if (authData.user) {
            // Then, create the business record in our database
            const { data: businessRecord, error: businessError } = await db.createBusiness({
                id: authData.user.id, // Use Supabase user ID
                business_name: businessData.businessName,
                owner_name: businessData.ownerName,
                email: businessData.email,
                phone: businessData.phone,
                password_hash: '', // We don't store password in our table
                logo_url: businessData.logo,
                auth_user_id: authData.user.id
            })

            if (businessError) {
                showAlert(`Business creation failed: ${businessError.message}`, 'error')
                return
            }

            showAlert('Business registered successfully! Please check your email to verify your account.', 'success')
            navigateTo('login')
        }
    } catch (error) {
        console.error('Registration error:', error)
        showAlert('Registration failed. Please try again.', 'error')
    }
}

function openModal(type: ModalState['type'], data: ModalState['data']) {
    setState({ modal: { type, data } });
}

function closeModal() {
    setState({ modal: { type: null, data: null } });
}

function handleDelete(id: number) {
    const newEntries = APP_STATE.entries.filter(e => e.id !== id);
    setState({ entries: newEntries, modal: { type: null, data: null } });
    showAlert('Entry deleted successfully.', 'success');
}

function handleDeleteAllMonthly(month: string) {
    const businessEntries = APP_STATE.entries.filter(e => e.businessId === APP_STATE.currentBusiness!.id);
    const otherBusinessEntries = APP_STATE.entries.filter(e => e.businessId !== APP_STATE.currentBusiness!.id);
    const newBusinessEntries = businessEntries.filter(e => !e.date.startsWith(month));

    setState({ entries: [...otherBusinessEntries, ...newBusinessEntries], modal: { type: null, data: null } });
    showAlert(`All entries for ${month} have been permanently deleted.`, 'success');
}

function handleEdit(entryData: Entry) {
    const index = APP_STATE.entries.findIndex(e => e.id === entryData.id);
    if (index > -1) {
        const newEntries = [...APP_STATE.entries];
        newEntries[index] = entryData;
        setState({ entries: newEntries, modal: { type: null, data: null } });
        showAlert('Entry updated successfully.', 'success');
    }
}

function exportToCsv(data: any[], filename: string) {
    if (data.length === 0) {
        showAlert('No data to export.', 'error');
        return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(value => {
        const strValue = String(value);
        // Handle commas in values by wrapping them in quotes
        if (strValue.includes(',')) {
            return `"${strValue}"`;
        }
        return strValue;
    }).join(','));
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
}

// --- AGENT MANAGEMENT ACTIONS ---

function handleRegisterAgent(agentData: Omit<ManagedAgent, 'id' | 'status' | 'businessId'>) {
    if (APP_STATE.managedAgents.some(a => a.businessId === APP_STATE.currentBusiness!.id && a.username.toLowerCase() === agentData.username.toLowerCase())) {
        showAlert('An agent with this username already exists in your business.', 'error');
        return;
    }

    const newAgent: ManagedAgent = {
        ...agentData,
        id: `agent_${Date.now()}`,
        businessId: APP_STATE.currentBusiness!.id,
        status: 'active',
    };

    const newAgents = [...APP_STATE.managedAgents, newAgent];
    setState({ managedAgents: newAgents });
    showAlert('Agent registered successfully!', 'success');
}

function handleUpdateAgent(agentData: ManagedAgent) {
    const index = APP_STATE.managedAgents.findIndex(a => a.id === agentData.id);
    if (index > -1) {
        // Check for duplicate username excluding the current agent within the same business
        if (APP_STATE.managedAgents.some(a => a.id !== agentData.id && a.businessId === agentData.businessId && a.username.toLowerCase() === agentData.username.toLowerCase())) {
            showAlert('An agent with this username already exists in your business.', 'error');
            return;
        }
        const newAgents = [...APP_STATE.managedAgents];
        newAgents[index] = { ...newAgents[index], ...agentData };
        setState({ managedAgents: newAgents, modal: { type: null, data: null } });
        showAlert('Agent updated successfully.', 'success');
    }
}

function handleUpdateAgentStatus(id: string, newStatus: boolean) {
    const index = APP_STATE.managedAgents.findIndex(a => a.id === id);
    if (index > -1) {
        const newAgents = [...APP_STATE.managedAgents];
        newAgents[index].status = newStatus ? 'active' : 'inactive';
        setState({ managedAgents: newAgents });
    }
}

function handleResetAgentPassword(id: string, newPassword?: string) {
    if (!newPassword || newPassword.length < 6) {
        showAlert('Password must be at least 6 characters long.', 'error');
        return;
    }
    const index = APP_STATE.managedAgents.findIndex(a => a.id === id);
    if (index > -1) {
        const newAgents = [...APP_STATE.managedAgents];
        newAgents[index].password = newPassword; // In a real app, this would be hashed.
        setState({ managedAgents: newAgents, modal: { type: null, data: null } });
        showAlert('Agent password has been reset.', 'success');
    }
}

function handleDeleteAgent(id: string) {
    const newAgents = APP_STATE.managedAgents.filter(a => a.id !== id);
    setState({ managedAgents: newAgents, modal: { type: null, data: null } });
    showAlert('Agent deleted successfully.', 'success');
}

function handleAgentPasswordCheck(agentId: string, passwordAttempt: string) {
    const agent = APP_STATE.managedAgents.find(a => a.id === agentId);

    if (!agent) {
        showAlert('Agent not found. Please refresh.', 'error');
        closeModal();
        return;
    }

    if (agent.status !== 'active') {
        showAlert('Your access has been disabled. Please contact admin.', 'error');
        closeModal();
        // Reset dropdown
        const agentSelect = document.querySelector('.role-select-dropdown') as HTMLSelectElement | null;
        if (agentSelect) {
            agentSelect.value = "";
        }
        return;
    }

    // In a real app, passwords would be hashed and compared securely.
    // For this mock app, we do a simple string comparison.
    if (agent.password !== passwordAttempt) {
        showAlert('Incorrect password.', 'error');
        const passwordInput = document.getElementById('agent-password-modal') as HTMLInputElement | null;
        if(passwordInput) passwordInput.value = "";
        return;
    }

    // Success
    closeModal();
    login('Entry Agent', agent.agentName);
    showAlert(`Welcome, ${agent.agentName}!`, 'success');
}

// --- GEMINI API INTEGRATION ---
async function fetchAiInsight(page: Page, prompt: string, contextData: any) {
    if (APP_STATE.isLoadingAi || APP_STATE.aiInsights[page]) return;
    
    // Check if AI is available
    if (!ai) {
        setState({ 
            isLoadingAi: false, 
            aiInsights: { 
                ...APP_STATE.aiInsights, 
                [page]: "AI insights are not available. Please configure your Gemini API key to enable this feature." 
            }
        });
        return;
    }
    
    setState({ isLoadingAi: true });
    try {
        const fullPrompt = `${prompt}. Here is the relevant data in JSON format: ${JSON.stringify(contextData)}. Keep your response concise, insightful, and directly address the prompt. Format the key points as a bulleted list using '•'.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
        });
        setState({ isLoadingAi: false, aiInsights: { ...APP_STATE.aiInsights, [page]: response.text.replace(/\*/g, '•') }});
    } catch (error) {
        console.error("Gemini API Error:", error);
        setState({ isLoadingAi: false, aiInsights: { ...APP_STATE.aiInsights, [page]: "Could not fetch AI insight. Please check the console." } });
    }
}

// --- UI COMPONENT BUILDERS ---
function createHomePage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'home-page';
    container.innerHTML = `
        <header class="home-header">
            <nav class="home-nav">
                <div class="logo">
                    <i class="fa-solid fa-chart-pie"></i>
                    <span>Branhox Gaming</span>
                </div>
                <div class="nav-links">
                    <a href="#" id="home-pricing">Pricing</a>
                    <a href="#" id="home-signup" class="btn">Signup</a>
                    <a href="#" id="home-login" class="btn btn-primary">Login</a>
                </div>
                <button class="mobile-nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
                    <i class="fa-solid fa-bars"></i>
                </button>
            </nav>
        </header>

        <main class="home-main">
            <section class="hero-section">
                <div class="hero-content">
                    <h1 class="animate-on-scroll">The Ultimate Gaming Agent Dashboard</h1>
                    <p class="animate-on-scroll">Streamline your operations. Track sales, manage players, and gain critical insights in real-time to grow your gaming business.</p>
                    <a href="#" id="hero-get-started" class="btn btn-primary animate-on-scroll">Get Started Now</a>
                </div>
            </section>

            <section id="how-it-works" class="feature-section">
                <h2 class="section-title animate-on-scroll">How It Works</h2>
                <p class="section-subtitle animate-on-scroll">A simple, streamlined process to get you up and running in minutes.</p>
                <div class="feature-cards">
                    <div class="feature-card animate-on-scroll">
                        <div class="feature-icon"><i class="fa-solid fa-file-pen"></i></div>
                        <h3>1. Submit Entries</h3>
                        <p>Agents quickly log every transaction—recharges, freeplays, and redeems—through an intuitive form.</p>
                    </div>
                    <div class="feature-card animate-on-scroll">
                        <div class="feature-icon"><i class="fa-solid fa-chart-line"></i></div>
                        <h3>2. Track Sales</h3>
                        <p>Admins get a bird's-eye view of all activities, with daily, monthly, and agent-specific reports.</p>
                    </div>
                    <div class="feature-card animate-on-scroll">
                        <div class="feature-icon"><i class="fa-solid fa-money-check-dollar"></i></div>
                        <h3>3. Automate Payouts</h3>
                        <p>Analyze performance, calculate commissions, and streamline your payment processes effortlessly.</p>
                    </div>
                </div>
            </section>
            
            <section id="why-use-it" class="benefits-section">
                <h2 class="section-title animate-on-scroll">Built for Performance</h2>
                 <div class="benefits-grid">
                    <div class="benefit-column animate-on-scroll">
                        <h3>For Admins</h3>
                        <ul>
                            <li><i class="fa-solid fa-check"></i> Centralized dashboard for all agent activities.</li>
                            <li><i class="fa-solid fa-check"></i> Real-time financial reporting and analytics.</li>
                            <li><i class="fa-solid fa-check"></i> Monitor agent progress and leaderboards.</li>
                            <li><i class="fa-solid fa-check"></i> In-depth referral and platform performance data.</li>
                        </ul>
                    </div>
                     <div class="benefit-column animate-on-scroll">
                        <h3>For Entry Agents</h3>
                        <ul>
                            <li><i class="fa-solid fa-check"></i> Simple and fast entry submission form.</li>
                            <li><i class="fa-solid fa-check"></i> View your recent submission history instantly.</li>
                            <li><i class="fa-solid fa-check"></i> Reduce errors with smart, dynamic forms.</li>
                            <li><i class="fa-solid fa-check"></i> Focus on players, not paperwork.</li>
                        </ul>
                    </div>
                </div>
            </section>

             <section id="reviews" class="testimonials-section">
                <h2 class="section-title animate-on-scroll">Trusted by Gaming Professionals</h2>
                <div class="testimonial-cards">
                    <div class="testimonial-card animate-on-scroll">
                        <p>"This tool revolutionized how we manage our agents. The insights from the referral tracker alone are worth it. Absolutely essential for any serious operation."</p>
                        <div class="author-info">
                            <span>- Alex, Admin</span>
                            <div class="stars">★★★★★</div>
                        </div>
                    </div>
                    <div class="testimonial-card animate-on-scroll">
                        <p>"As an agent, submitting my daily entries is now a breeze. It's fast, simple, and I can track my work easily. I can't imagine going back to spreadsheets."</p>
                        <div class="author-info">
                            <span>- Zara, Entry Agent</span>
                            <div class="stars">★★★★★</div>
                        </div>
                    </div>
                    <div class="testimonial-card animate-on-scroll">
                        <p>"The monthly reports are incredibly detailed. We've identified our most valuable platforms and optimized our strategy, leading to a significant revenue increase."</p>
                        <div class="author-info">
                            <span>- Hassan, Manager</span>
                            <div class="stars">★★★★★</div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="trust-badges" class="trust-section">
                <h3 class="animate-on-scroll">Supports All Major Payment Methods</h3>
                <div class="badges-container animate-on-scroll">
                    <img src="https://img.shields.io/badge/Chime-00D1C1?style=for-the-badge&logo=chime&logoColor=white" alt="Chime">
                    <img src="https://img.shields.io/badge/Cash_App-00C244?style=for-the-badge&logo=cash-app&logoColor=white" alt="CashApp">
                    <img src="https://img.shields.io/badge/Apple_Pay-000000?style=for-the-badge&logo=apple-pay&logoColor=white" alt="Apple Pay">
                    <img src="https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white" alt="PayPal">
                </div>
            </section>

            <section id="faq" class="faq-section">
                 <h2 class="section-title animate-on-scroll">Frequently Asked Questions</h2>
                 <div class="faq-container">
                    <div class="faq-item animate-on-scroll">
                        <button class="faq-question" aria-expanded="false">
                            <span>Is my data secure?</span>
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                        <div class="faq-answer">
                            <p>Absolutely. We prioritize data security with industry-standard encryption and access controls. Only authorized personnel can view the data they are permitted to see.</p>
                        </div>
                    </div>
                     <div class="faq-item animate-on-scroll">
                        <button class="faq-question" aria-expanded="false">
                            <span>Can I export my data?</span>
                             <i class="fa-solid fa-chevron-down"></i>
                        </button>
                        <div class="faq-answer">
                            <p>Yes, all reports (Daily, Monthly, Referral Logs, Agent Insights) can be exported to CSV format with a single click, allowing for further analysis or record-keeping.</p>
                        </div>
                    </div>
                     <div class="faq-item animate-on-scroll">
                        <button class="faq-question" aria-expanded="false">
                            <span>Is there a mobile version?</span>
                             <i class="fa-solid fa-chevron-down"></i>
                        </button>
                        <div class="faq-answer">
                            <p>The entire dashboard is fully responsive and designed to work seamlessly on desktops, tablets, and mobile devices, so you can manage your business from anywhere.</p>
                        </div>
                    </div>
                 </div>
            </section>
        </main>

        <footer class="home-footer">
            <p>&copy; ${new Date().getFullYear()} Branhox Gaming Solutions. All Rights Reserved.</p>
            <p>Contact us: <a href="mailto:support@branhox.com">support@branhox.com</a></p>
        </footer>
    `;
    
    // --- Event Listeners for Home Page ---

    const loginBtn = container.querySelector('#home-login');
    const getStartedBtn = container.querySelector('#hero-get-started');
    const signupBtn = container.querySelector('#home-signup');


    const navigateToLogin = (e: Event) => {
        e.preventDefault();
        navigateTo('login');
    };

    const navigateToRegister = (e: Event) => {
        e.preventDefault();
        navigateTo('registerBusiness');
    };

    loginBtn?.addEventListener('click', navigateToLogin);
    getStartedBtn?.addEventListener('click', navigateToLogin);
    signupBtn?.addEventListener('click', navigateToRegister);


    // FAQ Accordion
    container.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', () => {
            const item = button.parentElement as HTMLElement;
            const answer = item.querySelector('.faq-answer') as HTMLElement;
            const icon = button.querySelector('i') as HTMLElement;

            const isOpen = item.classList.contains('open');

            // Close all other items before toggling the current one
            container.querySelectorAll('.faq-item.open').forEach(openItem => {
                if (openItem !== item) {
                    openItem.classList.remove('open');
                    (openItem.querySelector('.faq-question') as HTMLButtonElement).setAttribute('aria-expanded', 'false');
                    (openItem.querySelector('.faq-answer') as HTMLElement).style.maxHeight = '0';
                    (openItem.querySelector('.faq-question i') as HTMLElement).style.transform = 'rotate(0deg)';
                }
            });

            // Toggle current item
            if (isOpen) {
                item.classList.remove('open');
                button.setAttribute('aria-expanded', 'false');
                answer.style.maxHeight = '0';
                icon.style.transform = 'rotate(0deg)';
            } else {
                item.classList.add('open');
                button.setAttribute('aria-expanded', 'true');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                icon.style.transform = 'rotate(180deg)';
            }
        });
    });

    // Mobile Navigation Toggle
    const mobileNavToggle = container.querySelector('.mobile-nav-toggle') as HTMLButtonElement;
    const navLinks = container.querySelector('.nav-links') as HTMLElement;
    mobileNavToggle?.addEventListener('click', () => {
        const isExpanded = navLinks.classList.toggle('active');
        mobileNavToggle.setAttribute('aria-expanded', String(isExpanded));
    });
    
    // Scroll Animation
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    container.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });

    return container;
}


function createBusinessLoginPage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'auth-container register-bg';
    container.innerHTML = `
        <div class="auth-card register-card">
            <div class="auth-header">
                <div class="logo">
                    <i class="fa-solid fa-chart-pie"></i>
                    <span>Branhox Gaming</span>
                </div>
                <h1>Login to Your Business Account</h1>
                <p>Enter your credentials to access your dashboard.</p>
            </div>
            <form id="business-login-form" class="auth-form" novalidate style="gap: 1.5rem; display: flex; flex-direction: column;">
                 <div class="form-group with-icon">
                    <label for="email">Business Email</label>
                    <i class="fa-solid fa-envelope"></i>
                    <input type="email" id="email" required placeholder="you@company.com" value="test@test.com">
                </div>
                <div class="form-group with-icon password-group">
                    <label for="password">Password</label>
                    <i class="fa-solid fa-lock"></i>
                    <input type="password" id="password" required placeholder="••••••••••" value="password">
                    <button type="button" id="password-toggle" class="password-toggle" aria-label="Toggle password visibility">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <button type="submit" class="btn btn-primary full-width" style="margin-top: 1rem;">Login</button>
            </form>
            <div class="auth-footer">
                <p>Don't have a business account? <a href="#" id="go-to-register">Register Now <i class="fa-solid fa-arrow-right-long"></i></a></p>
            </div>
        </div>
    `;

    const form = container.querySelector('#business-login-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = (form.querySelector('#email') as HTMLInputElement).value;
        const password = (form.querySelector('#password') as HTMLInputElement).value;
        if(form.checkValidity()){
            handleBusinessLogin(email, password);
        } else {
            showAlert('Please fill out all fields.', 'error');
        }
    });

    const passwordInput = container.querySelector('#password') as HTMLInputElement;
    const passwordToggle = container.querySelector('#password-toggle') as HTMLButtonElement;
    passwordToggle.addEventListener('click', () => {
        const icon = passwordToggle.querySelector('i')!;
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });

    container.querySelector('#go-to-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('registerBusiness');
    });

    return container;
}


function createRoleSelectionPage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'auth-container register-bg';
    const businessName = APP_STATE.currentBusiness?.businessName || 'Your Business';
    const businessAgents = APP_STATE.managedAgents.filter(a => a.businessId === APP_STATE.currentBusiness!.id);

    // The logout button is now a direct child of 'container' for screen-level positioning.
    // The '.role-selection-container' remains to center the welcome message and actions.
    container.innerHTML = `
        <button id="business-logout-top" class="btn-logout-top" title="Sign out">
            <i class="fa-solid fa-right-from-bracket"></i>
        </button>
        <div class="role-selection-container">
            <h1 class="role-selection-title">Welcome to <span class="glowing-text">${businessName}</span></h1>
            <p class="role-selection-subtitle">Please select your role to continue.</p>
            <div class="role-selection-actions"></div>
        </div>
    `;

    const selectionDiv = container.querySelector('.role-selection-actions')!;
    
    const adminButton = document.createElement('button');
    adminButton.className = 'btn btn-primary';
    adminButton.innerHTML = `<i class="fa-solid fa-user-shield"></i> Admin`;
    adminButton.onclick = () => login('Admin', 'Admin');
    
    const agentSelect = document.createElement('select');
    agentSelect.className = 'role-select-dropdown'; 

    const activeAgents = businessAgents.filter(a => a.status === 'active');
    agentSelect.innerHTML = `<option value="">Select Agent</option>${activeAgents.map(a => `<option value="${a.id}">${a.agentName.charAt(0).toUpperCase() + a.agentName.slice(1)}</option>`).join('')}`;
    
    agentSelect.onchange = (e) => {
        const agentId = (e.target as HTMLSelectElement).value;
        if (agentId) {
            const agent = businessAgents.find(a => a.id === agentId);
            if (agent) {
                openModal('agentPassword', agent);
            }
        }
    };

    selectionDiv.append(adminButton, agentSelect);
    
    // The listener is now attached to the button within the main 'container'.
    container.querySelector('#business-logout-top')?.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    return container;
}

function createRegisterBusinessPage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'auth-container register-bg';
    container.innerHTML = `
        <div class="auth-card register-card">
            <div class="auth-header">
                <div class="logo">
                    <i class="fa-solid fa-chart-pie"></i>
                    <span>Branhox Gaming</span>
                </div>
                <h1>Register Your Business Account</h1>
                <p>Start managing your gaming business in minutes.</p>
            </div>
            <form id="register-form" class="auth-form" novalidate>
                <div class="register-grid">
                    <div class="form-group with-icon">
                        <label for="businessName">Business Name</label>
                        <i class="fa-solid fa-building"></i>
                        <input type="text" id="businessName" required placeholder="e.g., Epic Gaming Inc.">
                    </div>
                    <div class="form-group with-icon">
                        <label for="ownerName">Owner Full Name</label>
                        <i class="fa-solid fa-user"></i>
                        <input type="text" id="ownerName" required placeholder="e.g., Jane Doe">
                    </div>
                    <div class="form-group with-icon">
                        <label for="email">Email Address</label>
                        <i class="fa-solid fa-envelope"></i>
                        <input type="email" id="email" required placeholder="you@company.com">
                    </div>
                     <div class="form-group with-icon">
                        <label for="phone">Phone Number</label>
                        <i class="fa-solid fa-phone"></i>
                        <input type="tel" id="phone" required placeholder="(555) 123-4567">
                    </div>
                    <div class="form-group with-icon password-group">
                        <label for="password">Password</label>
                        <i class="fa-solid fa-lock"></i>
                        <input type="password" id="password" required placeholder="••••••••••">
                        <button type="button" id="password-toggle" class="password-toggle" aria-label="Toggle password visibility">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>
                    <div class="form-group logo-upload-group">
                        <label for="logo">Business Logo (Optional)</label>
                        <div id="logo-drop-zone" class="logo-drop-zone">
                            <img id="logo-preview" class="logo-preview hidden" alt="Logo Preview"/>
                            <div id="logo-placeholder" class="logo-placeholder">
                                <i class="fa-solid fa-image"></i>
                                <span><strong>Click to upload</strong> or drag & drop</span>
                                <small>SVG, PNG, JPG (max. 800x400px)</small>
                            </div>
                        </div>
                        <input type="file" id="logo" accept="image/*" style="display: none;">
                    </div>
                </div>
                <button type="submit" class="btn btn-primary full-width">Register Business Account</button>
            </form>
            <div class="auth-footer">
                <p>Already have an account? <a href="#" id="go-to-login">Log In <i class="fa-solid fa-arrow-right-long"></i></a></p>
            </div>
        </div>
    `;

    const form = container.querySelector('#register-form') as HTMLFormElement;
    const passwordInput = container.querySelector('#password') as HTMLInputElement;
    const passwordToggle = container.querySelector('#password-toggle') as HTMLButtonElement;
    const logoInput = container.querySelector('#logo') as HTMLInputElement;
    const logoPreview = container.querySelector('#logo-preview') as HTMLImageElement;
    const logoDropZone = container.querySelector('#logo-drop-zone') as HTMLElement;
    let logoBase64: string | undefined = undefined;

    // Password visibility toggle
    passwordToggle.addEventListener('click', () => {
        const icon = passwordToggle.querySelector('i')!;
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });

    const handleFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                logoBase64 = reader.result as string;
                logoPreview.src = logoBase64;
                logoPreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            showAlert('Please select a valid image file.', 'error');
        }
    };

    // Logo upload listeners
    logoDropZone.addEventListener('click', () => logoInput.click());
    logoInput.addEventListener('change', () => {
        const file = logoInput.files?.[0];
        if (file) handleFile(file);
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        logoDropZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        logoDropZone.addEventListener(eventName, () => logoDropZone.classList.add('hover'));
    });
    ['dragleave', 'drop'].forEach(eventName => {
        logoDropZone.addEventListener(eventName, () => logoDropZone.classList.remove('hover'));
    });
    logoDropZone.addEventListener('drop', e => {
        const dt = e.dataTransfer;
        const file = dt?.files[0];
        if (file) handleFile(file);
    });


    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const businessData = {
            businessName: (form.querySelector('#businessName') as HTMLInputElement).value.trim(),
            ownerName: (form.querySelector('#ownerName') as HTMLInputElement).value.trim(),
            email: (form.querySelector('#email') as HTMLInputElement).value.trim(),
            phone: (form.querySelector('#phone') as HTMLInputElement).value.trim(),
            password: (form.querySelector('#password') as HTMLInputElement).value,
            logo: logoBase64
        };

        if(form.checkValidity()){
            handleBusinessRegistration(businessData);
        } else {
            showAlert('Please fill out all required fields correctly.', 'error');
            // This is a simple way to highlight invalid fields without being too intrusive
            Array.from(form.querySelectorAll(':invalid')).forEach(el => {
                (el as HTMLElement).style.borderColor = 'var(--error-red)';
            });
        }
    });

    container.querySelector('#go-to-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('login');
    });

    return container;
}


function createSidebar(): HTMLElement {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    const business = APP_STATE.currentBusiness!;
    
    const navItems = APP_STATE.role === 'Admin' 
        ? [
            { id: 'daily', icon: 'fa-calendar-day', text: 'Daily Report' },
            { id: 'monthly', icon: 'fa-calendar-alt', text: 'Monthly Report' },
            { id: 'referral', icon: 'fa-tags', text: 'Referral Report' },
            { id: 'progress', icon: 'fa-chart-line', text: 'Agent Progress' },
            { id: 'upload', icon: 'fa-upload', text: 'Upload CSV' },
            { id: 'submit', icon: 'fa-file-pen', text: 'Submit Entry' },
            { id: 'settings', icon: 'fa-sliders-h', text: 'Settings' },
            { id: 'manageAgents', icon: 'fa-users-cog', text: 'Manage Agents' },
        ]
        : [
            { id: 'submit', icon: 'fa-file-pen', text: 'Submit Entry' },
        ];

    const navLinks = navItems.map(item => `
        <a href="#" data-page="${item.id}" class="${APP_STATE.currentPage === item.id ? 'active' : ''}">
            <i class="fa-solid ${item.icon}"></i>
            <span>${item.text}</span>
        </a>
    `).join('');

    sidebar.innerHTML = `
        <div class="sidebar-header">
            ${business.logo ? `<img src="${business.logo}" alt="${business.businessName} logo" class="sidebar-logo">` : '<i class="fa-solid fa-chart-pie"></i>'}
            <h2>${business.businessName}</h2>
        </div>
        <nav class="sidebar-nav">${navLinks}</nav>
        <div class="sidebar-footer">
            <div class="user-info">
              <i class="fa-solid fa-user-circle"></i>
              <span>${APP_STATE.currentUser}</span>
            </div>
             <a href="#" data-page="logout" title="Logout">
                <i class="fa-solid fa-right-from-bracket"></i>
            </a>
        </div>
    `;

    sidebar.querySelectorAll('a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = (link as HTMLElement).dataset.page as Page | 'logout';
            if (page === 'logout') {
                logout();
            } else {
                navigateTo(page);
            }
        });
    });

    return sidebar;
}

function createModalComponent(): HTMLElement | null {
    const { type, data } = APP_STATE.modal;
    if (!type) return null;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.onclick = e => e.stopPropagation();

    if (type === 'delete') {
        modalContent.innerHTML = `
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete this entry? This action cannot be undone.</p>
            <div class="modal-actions">
                <button id="cancel-delete" class="btn">Cancel</button>
                <button id="confirm-delete" class="btn btn-danger">Delete</button>
            </div>
        `;
        modalOverlay.onclick = closeModal;
        modalContent.querySelector('#cancel-delete')?.addEventListener('click', closeModal);
        modalContent.querySelector('#confirm-delete')?.addEventListener('click', () => handleDelete(data as number));
    } else if (type === 'edit') {
        const entry = data as Entry;
        modalContent.innerHTML = `
            <h3>Edit Entry (ID: ${entry.id})</h3>
            <form id="edit-form" class="form-grid">
                <div class="form-group">
                    <label for="edit-username">Username</label>
                    <input type="text" id="edit-username" value="${entry.username}" required>
                </div>
                <div class="form-group">
                    <label for="edit-amount">Amount ($)</label>
                    <input type="number" id="edit-amount" value="${entry.amount}" required>
                </div>
                <div class="form-group">
                    <label for="edit-category">Category</label>
                    <select id="edit-category">${CATEGORIES.map(c => createOption(c, entry.category)).join('')}</select>
                </div>
                <div class="form-group">
                    <label for="edit-platform">Platform</label>
                    <select id="edit-platform">${APP_STATE.settings.platforms.map(p => createOption(p, entry.platform)).join('')}</select>
                </div>
                 <div class="modal-actions form-actions">
                    <button type="button" id="cancel-edit" class="btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        `;
        modalOverlay.onclick = closeModal;
        modalContent.querySelector('#cancel-edit')?.addEventListener('click', closeModal);
        const form = modalContent.querySelector('#edit-form') as HTMLFormElement;
        form.onsubmit = (e) => {
            e.preventDefault();
            const updatedEntry: Entry = {
                ...entry,
                username: (form.querySelector('#edit-username') as HTMLInputElement).value,
                amount: parseFloat((form.querySelector('#edit-amount') as HTMLInputElement).value),
                category: (form.querySelector('#edit-category') as HTMLSelectElement).value as Category,
                platform: (form.querySelector('#edit-platform') as HTMLSelectElement).value as Platform,
            };
            handleEdit(updatedEntry);
        };
    } else if (type === 'deleteAllMonthly') {
        const month = data as string;
        modalContent.innerHTML = `
            <h3><i class="fa-solid fa-triangle-exclamation"></i> Confirm Deletion</h3>
            <p>Are you sure you want to delete all entries for <strong>${month}</strong>? This action is irreversible and cannot be undone.</p>
            <div class="modal-confirm-check">
                <input type="checkbox" id="confirm-delete-all-check">
                <label for="confirm-delete-all-check">I confirm I want to permanently delete all entries.</label>
            </div>
            <div class="modal-actions">
                <button id="cancel-delete-all" class="btn">Cancel</button>
                <button id="confirm-delete-all" class="btn btn-danger" disabled>Delete</button>
            </div>
        `;
        modalOverlay.onclick = closeModal;
        modalContent.querySelector('#cancel-delete-all')?.addEventListener('click', closeModal);

        const confirmCheck = modalContent.querySelector('#confirm-delete-all-check') as HTMLInputElement;
        const confirmDeleteBtn = modalContent.querySelector('#confirm-delete-all') as HTMLButtonElement;

        confirmCheck.onchange = () => {
            confirmDeleteBtn.disabled = !confirmCheck.checked;
        };
        
        confirmDeleteBtn.onclick = () => handleDeleteAllMonthly(month);
    } else if (type === 'agentPageBreakdown') {
        const { agentName, breakdown } = data as AgentPageBreakdown;
        modalContent.classList.add('breakdown-modal-content');

        // Sort by amount descending
        breakdown.sort((a, b) => b.totalRecharge - a.totalRecharge);

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>Page Name Details for ${agentName}</h3>
                <button id="close-breakdown-modal" class="btn-icon" title="Close"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="table-container-modal">
                <table>
                    <thead>
                        <tr>
                            <th>Page Name</th>
                            <th>Total Recharge</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${breakdown.length > 0 ? breakdown.map(item => `
                            <tr>
                                <td>${item.pageName}</td>
                                <td class="recharge-value">${formatCurrency(item.totalRecharge)}</td>
                            </tr>
                        `).join('') : `<tr><td colspan="2" class="no-data-message">No recharge data for this agent.</td></tr>`}
                    </tbody>
                </table>
            </div>
        `;
        modalOverlay.onclick = closeModal;
        modalContent.querySelector('#close-breakdown-modal')?.addEventListener('click', closeModal);
    } else if (type === 'agentPlatformBreakdown') {
        const { agentName, breakdown } = data as AgentPlatformBreakdown;
        modalContent.classList.add('breakdown-modal-content');
        breakdown.sort((a, b) => b.rechargeCount - a.rechargeCount);

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>Platform Details for ${agentName}</h3>
                <button id="close-breakdown-modal" class="btn-icon" title="Close"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="table-container-modal">
                <table>
                    <thead>
                        <tr>
                            <th>Platform</th>
                            <th>Recharge Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${breakdown.length > 0 ? breakdown.map(item => `
                            <tr>
                                <td>${item.platform}</td>
                                <td>${item.rechargeCount}</td>
                            </tr>
                        `).join('') : `<tr><td colspan="2" class="no-data-message">No platform data for this agent.</td></tr>`}
                    </tbody>
                </table>
            </div>
        `;
        modalOverlay.onclick = closeModal;
        modalContent.querySelector('#close-breakdown-modal')?.addEventListener('click', closeModal);
    } else if (type === 'agentReferralBreakdown') {
        const { agentName, breakdown } = data as AgentReferralBreakdown;
        modalContent.classList.add('breakdown-modal-content');
        breakdown.sort((a, b) => b.totalRecharge - a.totalRecharge);

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>Referral Details for ${agentName}</h3>
                <button id="close-breakdown-modal" class="btn-icon" title="Close"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="table-container-modal">
                <table>
                    <thead>
                        <tr>
                            <th>Referral Code</th>
                            <th>Players Sent</th>
                            <th>Recharge Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${breakdown.length > 0 ? breakdown.map(item => `
                            <tr>
                                <td>${item.referralCode}</td>
                                <td>${item.playerCount}</td>
                                <td class="recharge-value">${formatCurrency(item.totalRecharge)}</td>
                            </tr>
                        `).join('') : `<tr><td colspan="3" class="no-data-message">No referral data for this agent.</td></tr>`}
                    </tbody>
                </table>
            </div>
        `;
        modalOverlay.onclick = closeModal;
        modalContent.querySelector('#close-breakdown-modal')?.addEventListener('click', closeModal);
    } else if (type === 'addSetting' || type === 'editSetting') {
        const isEdit = type === 'editSetting';
        const { key, singularName, currentValue, index } = data as SettingModalData;
        modalContent.innerHTML = `
            <h3>${isEdit ? 'Edit' : 'Add New'} ${singularName}</h3>
            <form id="setting-form" class="form-grid" style="grid-template-columns: 1fr;">
                <div class="form-group">
                    <label for="setting-value">${singularName} Name</label>
                    <input type="text" id="setting-value" value="${isEdit && currentValue ? currentValue : ''}" required>
                </div>
                 <div class="modal-actions form-actions">
                    <button type="button" class="btn" id="cancel-setting">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add'}</button>
                </div>
            </form>
        `;

        modalOverlay.onclick = closeModal;
        modalContent.querySelector('#cancel-setting')?.addEventListener('click', closeModal);
        const form = modalContent.querySelector('#setting-form') as HTMLFormElement;
        const input = form.querySelector('#setting-value') as HTMLInputElement;
        input.focus();

        form.onsubmit = (e) => {
            e.preventDefault();
            const trimmedValue = input.value.trim();

            if (trimmedValue === '') {
                showAlert('Value cannot be empty.', 'error');
                return;
            }

            const currentItems = (APP_STATE.settings[key] as string[]).map(item => item.toLowerCase());
            const isDuplicate = currentItems.some((item, i) => item === trimmedValue.toLowerCase() && (isEdit ? i !== index : true));

            if (isDuplicate) {
                showAlert(`"${trimmedValue}" already exists.`, 'error');
                return;
            }

            const newSettings = { ...APP_STATE.settings };
            if (isEdit) {
                (newSettings[key] as string[])[index!] = trimmedValue;
                showAlert('Item updated successfully.', 'success');
            } else {
                (newSettings[key] as string[]).push(trimmedValue);
                 // Sort the list alphabetically after adding
                (newSettings[key] as string[]).sort((a, b) => a.localeCompare(b));
                showAlert(`${singularName} added successfully.`, 'success');
            }
            setState({ settings: newSettings });
            closeModal();
        };
    } else if (type === 'deleteSetting') {
        const { key, index, currentValue } = data as SettingModalData;
        modalContent.innerHTML = `
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete "<strong>${currentValue}</strong>"? This action cannot be undone.</p>
            <div class="modal-actions">
                <button id="cancel-delete" class="btn">Cancel</button>
                <button id="confirm-delete" class="btn btn-danger">Delete</button>
            </div>
        `;
        modalOverlay.onclick = closeModal;
        modalContent.querySelector('#cancel-delete')?.addEventListener('click', closeModal);
        modalContent.querySelector('#confirm-delete')?.addEventListener('click', () => {
            const newSettings = { ...APP_STATE.settings };
            (newSettings[key] as string[]).splice(index!, 1);
            setState({ settings: newSettings });
            closeModal();
            showAlert('Item deleted successfully.', 'success');
        });
    } else if (type === 'editAgent') {
        const agent = data as ManagedAgent;
        modalContent.innerHTML = `
            <h3>Edit Agent</h3>
            <form id="edit-agent-form" class="form-grid">
                 <div class="form-group">
                    <label for="edit-agent-name">Agent Name</label>
                    <input type="text" id="edit-agent-name" value="${agent.agentName}" required>
                </div>
                <div class="form-group">
                    <label for="edit-agent-username">Username or Email</label>
                    <input type="text" id="edit-agent-username" value="${agent.username}" required>
                </div>
                <div class="form-group full-width">
                    <label for="edit-agent-role">Assign Role</label>
                    <select id="edit-agent-role">${AGENT_ACCESS_ROLES.map(r => createOption(r, agent.role)).join('')}</select>
                </div>
                 <div class="modal-actions form-actions">
                    <button type="button" class="btn" id="cancel-edit-agent">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        `;
        modalOverlay.onclick = closeModal;
        modalContent.querySelector('#cancel-edit-agent')?.addEventListener('click', closeModal);
        const form = modalContent.querySelector('#edit-agent-form') as HTMLFormElement;
        form.onsubmit = (e) => {
            e.preventDefault();
            const updatedAgent: ManagedAgent = {
                ...agent,
                agentName: (form.querySelector('#edit-agent-name') as HTMLInputElement).value,
                username: (form.querySelector('#edit-agent-username') as HTMLInputElement).value,
                role: (form.querySelector('#edit-agent-role') as HTMLSelectElement).value as AgentAccessRole,
            };
            handleUpdateAgent(updatedAgent);
        };
    } else if (type === 'deleteAgent') {
        const agent = data as ManagedAgent;
        modalContent.innerHTML = `
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete the agent "<strong>${agent.agentName}</strong>"? This action cannot be undone.</p>
            <div class="modal-actions">
                <button id="cancel-delete" class="btn">Cancel</button>
                <button id="confirm-delete" class="btn btn-danger">Delete</button>
            </div>
        `;
        modalOverlay.onclick = closeModal;
        modalContent.querySelector('#cancel-delete')?.addEventListener('click', closeModal);
        modalContent.querySelector('#confirm-delete')?.addEventListener('click', () => handleDeleteAgent(agent.id));
    } else if (type === 'resetAgentPassword') {
        const agent = data as ManagedAgent;
        modalContent.innerHTML = `
            <h3>Reset Password for ${agent.agentName}</h3>
            <form id="reset-password-form" class="form-grid" style="grid-template-columns: 1fr;">
                 <div class="form-group">
                    <label for="new-password">New Password</label>
                    <input type="password" id="new-password" required minlength="6">
                </div>
                 <div class="modal-actions form-actions">
                    <button type="button" class="btn" id="cancel-reset">Cancel</button>
                    <button type="submit" class="btn btn-primary">Reset Password</button>
                </div>
            </form>
        `;
        modalOverlay.onclick = closeModal;
        modalContent.querySelector('#cancel-reset')?.addEventListener('click', closeModal);
        const form = modalContent.querySelector('#reset-password-form') as HTMLFormElement;
        form.onsubmit = (e) => {
            e.preventDefault();
            const newPassword = (form.querySelector('#new-password') as HTMLInputElement).value;
            handleResetAgentPassword(agent.id, newPassword);
        };
    } else if (type === 'agentPassword') {
        const agent = data as ManagedAgent;
        modalContent.className = 'auth-card agent-login-modal'; // Use auth-card styles for premium look

        modalContent.innerHTML = `
            <div class="auth-header">
                <div class="logo">
                    <i class="fa-solid fa-user-shield"></i>
                </div>
                <h1>Login as ${agent.agentName}</h1>
                <p>Enter your password to access the agent dashboard.</p>
            </div>
            <form id="agent-password-form" class="auth-form" novalidate>
                <div class="form-group with-icon password-group">
                    <label for="agent-password-modal">Password</label>
                    <i class="fa-solid fa-lock"></i>
                    <input type="password" id="agent-password-modal" required placeholder="••••••••••" autocomplete="current-password">
                    <button type="button" id="password-toggle-modal" class="password-toggle" aria-label="Toggle password visibility">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <div class="modal-actions" style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
                    <button type="submit" class="btn btn-primary full-width">Login</button>
                    <button type="button" class="btn btn-secondary full-width" id="cancel-agent-login">Cancel</button>
                </div>
            </form>
        `;

        const closeModalAndResetSelect = () => {
            const agentSelect = document.querySelector('.role-select-dropdown') as HTMLSelectElement | null;
            if (agentSelect) {
                agentSelect.value = "";
            }
            closeModal();
        };

        modalOverlay.onclick = closeModalAndResetSelect;
        modalContent.querySelector('#cancel-agent-login')?.addEventListener('click', closeModalAndResetSelect);
        
        const form = modalContent.querySelector('#agent-password-form') as HTMLFormElement;
        const passwordInput = form.querySelector('#agent-password-modal') as HTMLInputElement;
        passwordInput.focus();

        const passwordToggle = modalContent.querySelector('#password-toggle-modal') as HTMLButtonElement;
        passwordToggle.addEventListener('click', () => {
            const icon = passwordToggle.querySelector('i')!;
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });

        form.onsubmit = (e) => {
            e.preventDefault();
            handleAgentPasswordCheck(agent.id, passwordInput.value);
        };
    }


    modalOverlay.appendChild(modalContent);
    return modalOverlay;
}

function createTable(headers: string[], rows: any[][], actions?: (item: any) => string): string {
    const colCount = headers.length + (actions ? 1 : 0);
    return `
        <div class="table-container">
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}${actions ? '<th>Actions</th>' : ''}</tr>
                </thead>
                <tbody>
                    ${rows.length === 0
                        ? `<tr><td colspan="${colCount}" style="text-align:center;padding:2rem;">No data found.</td></tr>`
                        : rows.map(row => `
                            <tr>
                                ${(actions ? row.slice(0, -1) : row).map(cell => `<td>${cell}</td>`).join('')}
                                ${actions ? `<td class="table-actions">${actions(row[row.length - 1])}</td>` : ''}
                            </tr>
                        `).join('')
                    }
                </tbody>
            </table>
        </div>
    `;
}

function createAiInsightCard(page: Page): string {
    let aiContent = '';
    const isAiAvailable = !!ai;
    
    if (!isAiAvailable) {
        aiContent = `<p class="ai-unavailable">AI insights are not available. Please configure your Gemini API key to enable this feature.</p>`;
    } else if (APP_STATE.isLoadingAi) {
        aiContent = `<div class="loading-spinner"></div>`;
    } else if (APP_STATE.aiInsights[page]) {
        aiContent = `<p>${APP_STATE.aiInsights[page]}</p>`;
    } else {
        aiContent = `<p>Click the button to generate insights.</p>`
    }

    return `
        <div class="ai-insight-card">
            <div class="card-header">
                <div>
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    <h3>AI Summary</h3>
                </div>
                ${isAiAvailable ? `
                <button class="btn-icon" id="fetch-ai-${page}" ${APP_STATE.isLoadingAi ? 'disabled' : ''}>
                    <i class="fa-solid fa-arrows-rotate"></i>
                </button>
                ` : ''}
            </div>
            ${aiContent}
        </div>
    `;
}

function createSubmitForm(): HTMLElement {
    const container = document.createElement('div');
    const today = new Date().toISOString().split('T')[0];
    const agentName = APP_STATE.currentUser!;
    const businessId = APP_STATE.currentBusiness!.id;

    container.innerHTML = `
        <div class="page-header"><h1>Submit New Entry</h1></div>
        <div class="form-container">
            <form id="entry-form">
                <div class="form-grid">
                    <div class="form-group"><label for="date">Date</label><input type="date" id="date" value="${today}"></div>
                    <div class="form-group-special">
                        <label for="agentName">Agent Name</label>
                        <div class="input-wrapper">
                            <input type="text" id="agentName" value="${agentName.charAt(0).toUpperCase() + agentName.slice(1)}" readonly>
                            <i class="fa-solid fa-user"></i>
                        </div>
                    </div>
                    <div class="form-group"><label for="category">Category</label><select id="category">${CATEGORIES.map(c => createOption(c)).join('')}</select></div>
                    <div class="form-group"><label for="pageName">Page Name</label><select id="pageName">${APP_STATE.settings.pageNames.map(p => createOption(p)).join('')}</select></div>
                    <div class="form-group"><label for="username">Username</label><input type="text" id="username" placeholder="e.g., player123" required></div>
                    <div class="form-group" id="amount-group"><label for="amount">Amount ($)</label><input type="number" id="amount" placeholder="e.g., 50" required></div>
                    <div class="form-group"><label for="pointsLoad">Points Load</label><input type="number" id="pointsLoad" placeholder="e.g., 5000" required></div>
                    <div class="form-group"><label for="platform">Platform</label><select id="platform">${APP_STATE.settings.platforms.map(p => createOption(p)).join('')}</select></div>
                    <div class="form-group"><label for="referralCode">Referral Code</label><select id="referralCode">${REFERRAL_CODES.map(rc => createOption(rc)).join('')}</select></div>
                    <div class="form-group" id="redeemType-group"><label for="redeemType">Redeem Type</label><select id="redeemType">${REDEEM_TYPES.map(rt => createOption(rt)).join('')}</select></div>
                    <div class="form-group" id="paymentMethod-group"><label for="paymentMethod">Payment Method</label><select id="paymentMethod">${APP_STATE.settings.paymentMethods.map(pm => createOption(pm)).join('')}</select></div>
                    <div class="form-group full-width" id="playerHistory-group"><label for="playerHistory">Player History</label><select id="playerHistory">${APP_STATE.settings.playerHistories.map(ph => createOption(ph)).join('')}</select></div>
                </div>
                <div class="form-actions"><button type="submit" class="btn btn-primary"><i class="fa-solid fa-paper-plane"></i> Submit Entry</button></div>
            </form>
        </div>
        <div class="content-block"><h2>Your Last 5 Submissions</h2><div class="table-container" id="last-submissions"></div></div>`;

    const form = container.querySelector('#entry-form') as HTMLFormElement;
    const categorySelect = container.querySelector('#category') as HTMLSelectElement;
    const amountGroup = container.querySelector('#amount-group')!;
    const redeemTypeGroup = container.querySelector('#redeemType-group')!;
    const paymentMethodGroup = container.querySelector('#paymentMethod-group')!;
    const amountInput = container.querySelector('#amount') as HTMLInputElement;
    const playerHistorySelect = container.querySelector('#playerHistory') as HTMLSelectElement;
    const playerHistoryGroup = container.querySelector('#playerHistory-group')!;
    const pointsLoadLabel = container.querySelector('label[for="pointsLoad"]')!;


    const updateFormVisibility = () => {
        const selectedCategory = categorySelect.value as Category;
        const isFreeplay = selectedCategory === 'Freeplay';
        const isRedeem = selectedCategory === 'Redeem';

        // Amount and Payment Method are hidden ONLY for Freeplay
        amountGroup.classList.toggle('hidden', isFreeplay);
        paymentMethodGroup.classList.toggle('hidden', isFreeplay);
        amountInput.required = !isFreeplay;

        // Per latest request: Hide Redeem Type and Player History when Category is "Redeem"
        // Redeem Type is now always hidden as it was only shown for Redeem previously.
        redeemTypeGroup.classList.toggle('hidden', true);
        playerHistoryGroup.classList.toggle('hidden', isRedeem);

        // Per latest request: Rename "Points Load" label for "Redeem"
        pointsLoadLabel.textContent = isRedeem ? 'Redeem Points' : 'Points Load';

        // Update Player History options based on Category (only when visible)
        if (!isRedeem) {
            let visiblePlayerHistories: PlayerHistory[];
            switch (selectedCategory) {
                case 'Freeplay':
                    visiblePlayerHistories = ['New Freeplay', 'Null'];
                    break;
                case 'Recharge':
                    visiblePlayerHistories = ['Already Paid', 'New Paid'];
                    break;
                default: // Should not be hit, but provides a fallback
                    visiblePlayerHistories = APP_STATE.settings.playerHistories;
                    break;
            }

            const currentValue = playerHistorySelect.value;
            // Filter available histories from the main list in settings
            const availableOptions = APP_STATE.settings.playerHistories.filter(ph => visiblePlayerHistories.includes(ph));
            playerHistorySelect.innerHTML = availableOptions.map(ph => createOption(ph)).join('');

            // Restore previous selection if it's still a valid option
            if (availableOptions.includes(currentValue as PlayerHistory)) {
                playerHistorySelect.value = currentValue;
            }
        }
    };


    categorySelect.addEventListener('change', updateFormVisibility);
    // Set initial state
    updateFormVisibility();

    form.onsubmit = (e) => {
        e.preventDefault();

        const category = (form.querySelector('#category') as HTMLSelectElement).value as Category;
        const isFreeplay = category === 'Freeplay';
        const isRedeem = category === 'Redeem';


        const referralCodeValue = (form.querySelector('#referralCode') as HTMLSelectElement).value as ReferralCode;
        let determinedSource: Source;
        if (referralCodeValue === 'ADS') {
            determinedSource = 'Ads';
        } else if (referralCodeValue === 'Random') {
            determinedSource = 'Random';
        } else {
            determinedSource = 'Referral';
        }

        const newEntry: Entry = {
            id: Math.max(...APP_STATE.entries.map(e => e.id), 0) + 1,
            businessId: businessId,
            date: (form.querySelector('#date') as HTMLInputElement).value,
            agentName: agentName,
            category: category,
            pageName: (form.querySelector('#pageName') as HTMLSelectElement).value as PageName,
            username: (form.querySelector('#username') as HTMLInputElement).value,
            amount: isFreeplay || isRedeem ? 0 : parseFloat((form.querySelector('#amount') as HTMLInputElement).value),
            pointsLoad: parseInt((form.querySelector('#pointsLoad') as HTMLInputElement).value),
            platform: (form.querySelector('#platform') as HTMLSelectElement).value as Platform,
            source: determinedSource,
            referralCode: referralCodeValue,
            redeemType: (form.querySelector('#redeemType') as HTMLSelectElement).value as RedeemType,
            paymentMethod: isFreeplay ? APP_STATE.settings.paymentMethods[0] : (form.querySelector('#paymentMethod') as HTMLSelectElement).value as PaymentMethod,
            playerHistory: (form.querySelector('#playerHistory') as HTMLSelectElement).value as PlayerHistory,
        };
        const newEntries = [newEntry, ...APP_STATE.entries];
        setState({ entries: newEntries });
        showAlert('Entry submitted successfully!');
        form.reset();
        (form.querySelector('#username') as HTMLInputElement).focus();
        // After reset, category goes to default, so we need to update visibility
        updateFormVisibility();
    };
    
    const lastSubmissionsDiv = container.querySelector('#last-submissions')!;
    const agentEntries = APP_STATE.entries.filter(entry => entry.businessId === businessId && entry.agentName === APP_STATE.currentUser).slice(0, 5);
    const headers = ['Date', 'Username', 'Amount', 'Category', 'Platform'];
    const rows = agentEntries.map(e => [formatDate(e.date), e.username, formatCurrency(e.amount), `<span class="tag ${e.category.toLowerCase()}">${e.category}</span>`, e.platform]);
    lastSubmissionsDiv.innerHTML = createTable(headers, rows);

    return container;
}

function createDailyReport(): HTMLElement {
    const container = document.createElement('div');
    const { agent, platform, date, pageName, paymentMethod, category } = APP_STATE.filters.daily;
    
    const businessEntries = APP_STATE.entries.filter(e => e.businessId === APP_STATE.currentBusiness!.id);
    const businessAgents = APP_STATE.managedAgents.filter(a => a.businessId === APP_STATE.currentBusiness!.id);

    const filteredEntries = businessEntries.filter(e => {
        const dateMatch = !date || e.date === date;
        const agentMatch = !agent || e.agentName === agent;
        const platformMatch = !platform || e.platform === platform;
        const pageNameMatch = !pageName || e.pageName === pageName;
        const paymentMethodMatch = !paymentMethod || e.paymentMethod === paymentMethod;
        const categoryMatch = !category || e.category === category;
        return dateMatch && agentMatch && platformMatch && pageNameMatch && paymentMethodMatch && categoryMatch;
    });

    const totalRecharge = filteredEntries.filter(e => e.category === 'Recharge').reduce((sum, e) => sum + e.amount, 0);
    const totalFreeplay = filteredEntries.filter(e => e.category === 'Freeplay').reduce((sum, e) => sum + e.amount, 0);
    const totalPoints = filteredEntries.reduce((sum, e) => sum + e.pointsLoad, 0);

    // --- DETAILED SUMMARY CALCULATIONS ---
    const pageNameLoad = filteredEntries
        .filter(e => e.category === 'Recharge' && e.amount > 0)
        .reduce((acc, e) => {
            acc[e.pageName] = (acc[e.pageName] || 0) + e.amount;
            return acc;
        }, {} as Record<PageName, number>);
    const sortedPageNameLoad = Object.entries(pageNameLoad).sort((a, b) => b[1] - a[1]).slice(0, 7);

    const referralCodeLoad = filteredEntries
        .filter(e => e.category === 'Recharge' && e.amount > 0)
        .reduce((acc, e) => {
            acc[e.referralCode] = (acc[e.referralCode] || 0) + e.amount;
            return acc;
        }, {} as Record<ReferralCode, number>);
    const sortedReferralCodeLoad = Object.entries(referralCodeLoad).sort((a, b) => b[1] - a[1]).slice(0, 7);
    
    const platformLoad = filteredEntries
        .filter(e => e.category === 'Recharge' && e.amount > 0)
        .reduce((acc, e) => {
            acc[e.platform] = (acc[e.platform] || 0) + e.amount;
            return acc;
        }, {} as Record<Platform, number>);
    const sortedPlatformLoad = Object.entries(platformLoad).sort((a, b) => b[1] - a[1]).slice(0, 7);

    // --- DETAILED SUMMARY HTML HELPER ---
    const createDetailedSummaryList = (title: string, data: [string, number][]) => {
        const cardContent = data.length > 0
            ? `<ul class="detailed-summary-list">
                ${data.map(([name, value], index) => `
                    <li>
                        <span class="summary-item-name">
                            <span class="summary-color-dot c${index % 10}"></span>
                            ${name}
                        </span>
                        <span class="summary-item-value">${formatCurrency(value)}</span>
                    </li>
                `).join('')}
            </ul>`
            : `<p class="no-data-message">No recharge data for current filters.</p>`;
        
        return `
            <div class="content-block">
                <h2>${title}</h2>
                ${cardContent}
            </div>
        `;
    };

    const newSummaryCardsHTML = `
        <div class="detailed-stats-grid">
            ${createDetailedSummaryList("Load by Page Name", sortedPageNameLoad)}
            ${createDetailedSummaryList("Load by Referral Code", sortedReferralCodeLoad)}
            ${createDetailedSummaryList("Load by Platform", sortedPlatformLoad)}
        </div>
    `;

    container.innerHTML = `
        <div class="page-header"><h1>Daily Report</h1></div>
        
        <div class="daily-filter-bar">
            <button id="filter-toggle" class="btn filter-toggle-btn" aria-expanded="false">
                <i class="fa-solid fa-filter"></i>
                <span>Filters</span>
                <i class="fa-solid fa-chevron-down toggle-icon"></i>
            </button>
            <div class="filter-drawer">
                <div class="filter-drawer-content">
                    <div class="filter-grid">
                        <div class="filter-group">
                            <label for="date-filter">Date</label>
                            <input type="date" id="date-filter" class="daily-filter-control" value="${date}">
                        </div>
                        <div class="filter-group">
                            <label for="pageName-filter">Page Name</label>
                            <select id="pageName-filter" class="daily-filter-control">
                                <option value="">All Pages</option>
                                ${APP_STATE.settings.pageNames.map(p => createOption(p, pageName)).join('')}
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="platform-filter">Platform</label>
                            <select id="platform-filter" class="daily-filter-control">
                                <option value="">All Platforms</option>
                                ${APP_STATE.settings.platforms.map(p => createOption(p, platform)).join('')}
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="agent-filter">Agent Name</label>
                            <select id="agent-filter" class="daily-filter-control">
                                <option value="">All Agents</option>
                                ${businessAgents.map(a => createOption(a.agentName, agent)).join('')}
                            </select>
                        </div>
                         <div class="filter-group">
                            <label for="paymentMethod-filter">Payment Method</label>
                            <select id="paymentMethod-filter" class="daily-filter-control">
                                <option value="">All Methods</option>
                                ${APP_STATE.settings.paymentMethods.map(p => createOption(p, paymentMethod)).join('')}
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="category-filter">Category</label>
                            <select id="category-filter" class="daily-filter-control">
                                <option value="">All Categories</option>
                                ${CATEGORIES.map(c => createOption(c, category)).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="filter-actions">
                         <button id="clear-daily-filters" class="btn btn-secondary">Clear Filters</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card"><div class="card-header"><h3>Total Recharge</h3><i class="icon fa-solid fa-dollar-sign"></i></div><div class="value">${formatCurrency(totalRecharge)}</div></div>
            <div class="stat-card"><div class="card-header"><h3>Total Freeplay</h3><i class="icon fa-solid fa-gift"></i></div><div class="value">${formatCurrency(totalFreeplay)}</div></div>
            <div class="stat-card"><div class="card-header"><h3>Total Points Loaded</h3><i class="icon fa-solid fa-star"></i></div><div class="value">${totalPoints.toLocaleString()}</div></div>
        </div>

        ${newSummaryCardsHTML}

        <div class="content-block" style="margin-top: 1.5rem;">
            <div class="table-header">
                <h2>Entries (${filteredEntries.length})</h2>
                <div class="filters">
                    <button class="btn" id="export-daily"><i class="fa-solid fa-download"></i> Export</button>
                </div>
            </div>
            <div id="daily-table"></div>
        </div>
    `;

    // --- Event Listeners for new filters ---
    const toggleBtn = container.querySelector('#filter-toggle');
    const drawer = container.querySelector('.filter-drawer');
    toggleBtn?.addEventListener('click', () => {
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        toggleBtn.setAttribute('aria-expanded', String(!isExpanded));
        drawer?.classList.toggle('open');
        if (!isExpanded) {
            (drawer as HTMLElement).style.maxHeight = (drawer as HTMLElement).scrollHeight + 'px';
        } else {
            (drawer as HTMLElement).style.maxHeight = '0px';
        }
    });

    container.querySelector('#clear-daily-filters')?.addEventListener('click', () => {
        setState({
            filters: {
                ...APP_STATE.filters,
                daily: {
                    agent: '',
                    platform: '',
                    date: new Date().toISOString().split('T')[0],
                    pageName: '',
                    paymentMethod: '',
                    category: ''
                }
            }
        });
    });

    container.querySelector('#date-filter')?.addEventListener('change', e => handleFilterChange('daily', 'date', (e.target as HTMLInputElement).value));
    container.querySelector('#pageName-filter')?.addEventListener('change', e => handleFilterChange('daily', 'pageName', (e.target as HTMLSelectElement).value));
    container.querySelector('#agent-filter')?.addEventListener('change', e => handleFilterChange('daily', 'agent', (e.target as HTMLSelectElement).value));
    container.querySelector('#platform-filter')?.addEventListener('change', e => handleFilterChange('daily', 'platform', (e.target as HTMLSelectElement).value));
    container.querySelector('#paymentMethod-filter')?.addEventListener('change', e => handleFilterChange('daily', 'paymentMethod', (e.target as HTMLSelectElement).value));
    container.querySelector('#category-filter')?.addEventListener('change', e => handleFilterChange('daily', 'category', (e.target as HTMLSelectElement).value));
    
    container.querySelector('#export-daily')?.addEventListener('click', () => exportToCsv(filteredEntries, 'daily_report'));

    const headers = ['Agent', 'Username', 'Amount', 'Category', 'Platform', 'Payment'];
    const rows = filteredEntries.map(e => [e.agentName, e.username, formatCurrency(e.amount), `<span class="tag ${e.category.toLowerCase()}">${e.category}</span>`, e.platform, e.paymentMethod, e]);
    const actions = (entry: Entry) => `
        <button class="btn-icon" onclick="openModal('edit', ${JSON.stringify(entry).replace(/"/g, '&quot;')})" title="Edit"><i class="fa-solid fa-pencil"></i></button>
        <button class="btn-icon btn-icon-danger" onclick="openModal('delete', ${entry.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
    `;
    container.querySelector('#daily-table')!.innerHTML = createTable(headers, rows, actions);

    return container;
}


function createMonthlyReport(): HTMLElement {
    const container = document.createElement('div');
    const { month, currentPage, rowsPerPage } = APP_STATE.filters.monthly;

    const businessEntries = APP_STATE.entries.filter(e => e.businessId === APP_STATE.currentBusiness!.id);
    const monthlyEntries = businessEntries.filter(e => e.date.startsWith(month));
    const totalRecharge = monthlyEntries.filter(e => e.category === 'Recharge').reduce((sum, e) => sum + e.amount, 0);
    const totalFreeplay = monthlyEntries.filter(e => e.category === 'Freeplay').reduce((sum, e) => sum + e.amount, 0);
    const totalCoinUsed = monthlyEntries.reduce((sum, e) => sum + e.pointsLoad, 0);

    const paymentMethodStats = monthlyEntries.reduce((acc, e) => {
        if (e.category === 'Recharge') {
            const existing = acc[e.paymentMethod] || { totalAmount: 0, transactionCount: 0 };
            existing.totalAmount += e.amount;
            existing.transactionCount += 1;
            acc[e.paymentMethod] = existing;
        }
        return acc;
    }, {} as Record<PaymentMethod, { totalAmount: number, transactionCount: number }>);

    const freeplayRatio = totalRecharge > 0 ? (totalFreeplay / totalRecharge) * 100 : 0;
    
    let topPaymentMethod: { name: string; data: { totalAmount: number; transactionCount: number } } | null = null;
    if (Object.keys(paymentMethodStats).length > 0) {
        const topMethodEntry = Object.entries(paymentMethodStats).reduce((top, current) => 
            current[1].totalAmount > top[1].totalAmount ? current : top
        );
        topPaymentMethod = { name: topMethodEntry[0], data: topMethodEntry[1] };
    }
    
    const maxPaymentAmount = Math.max(...Object.values(paymentMethodStats).map(d => d.totalAmount), 0);

    const platformCoinStats = monthlyEntries.reduce((acc, e) => {
        acc[e.platform] = (acc[e.platform] || 0) + e.pointsLoad;
        return acc;
    }, {} as Record<Platform, number>);
    
    const sortedPlatformStats = Object.entries(platformCoinStats).sort((a, b) => b[1] - a[1]);
    const maxPlatformCoins = sortedPlatformStats.length > 0 ? sortedPlatformStats[0][1] : 0;
    
    // --- Pagination Calculations ---
    const totalEntries = monthlyEntries.length;
    const totalPages = Math.ceil(totalEntries / rowsPerPage) || 1;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedEntries = monthlyEntries.slice(startIndex, startIndex + rowsPerPage);


    container.innerHTML = `
        <div class="page-header"><h1>Monthly Report</h1></div>
        <div class="table-header">
            <h2>Report for <input type="month" id="month-filter" value="${month}"></h2>
            <button class="btn" id="export-monthly"><i class="fa-solid fa-download"></i> Export</button>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><h3>Total Recharge</h3><div class="value">${formatCurrency(totalRecharge)}</div></div>
            <div class="stat-card"><h3>Total Freeplay</h3><div class="value">${formatCurrency(totalFreeplay)}</div></div>
            <div class="stat-card"><h3>Total Coin Used</h3><div class="value">${totalCoinUsed.toLocaleString()}</div></div>
        </div>
        
        <div class="grid-2 monthly-insights-grid">
             <div class="content-block">
                <h2>Payment Method Load</h2>
                ${Object.keys(paymentMethodStats).length > 0 ? `
                <div class="bar-chart payment-method-chart">
                    ${Object.entries(paymentMethodStats).sort((a,b) => b[1].totalAmount - a[1].totalAmount).map(([method, stats], index) => {
                        const heightPercentage = maxPaymentAmount > 0 ? (stats.totalAmount / maxPaymentAmount) * 90 : 0; // 90 to leave room for label
                        return `
                        <div class="bar-group">
                            <div class="bar c${index % 4}" 
                                 style="height: ${heightPercentage}%;" 
                                 data-value="${formatCurrency(stats.totalAmount)}"
                                 title="${stats.transactionCount} transaction${stats.transactionCount !== 1 ? 's' : ''}">
                            </div>
                            <label>${method}</label>
                        </div>
                        `;
                    }).join('')}
                </div>
                ` : `<p class="no-data-message">No recharge data for this month.</p>`}
            </div>
            <div class="insights-stack">
                ${topPaymentMethod ? `
                <div class="highlight-card">
                    <h4><i class="fa-solid fa-trophy"></i> Top Payment Method</h4>
                    <h3>${topPaymentMethod.name}</h3>
                    <p>
                        <strong>${formatCurrency(topPaymentMethod.data.totalAmount)}</strong> 
                        <span>(${totalRecharge > 0 ? ((topPaymentMethod.data.totalAmount / totalRecharge) * 100).toFixed(0) : 0}% of Total)</span>
                    </p>
                    <span class="transaction-count">${topPaymentMethod.data.transactionCount} transaction${topPaymentMethod.data.transactionCount !== 1 ? 's' : ''}</span>
                </div>
                ` : `
                <div class="highlight-card placeholder">
                    <h4><i class="fa-solid fa-trophy"></i> Top Payment Method</h4>
                    <p class="no-data-message" style="padding: 1rem 0;">No recharge data available.</p>
                </div>
                `}

                <div class="stat-card">
                    <div class="card-header"><h3>Freeplay Ratio</h3><i class="icon fa-solid fa-percent"></i></div>
                    <div class="value">${freeplayRatio.toFixed(1)}</div>
                    <p style="text-align: right; margin-top: -0.5rem; color: var(--inactive-gray); font-weight: 500;">of Total Recharge</p>
                </div>
            </div>
        </div>

        <div class="content-block" style="margin-top: 1.5rem;">
            <h2>Coins Used by Gaming Platform</h2>
            ${sortedPlatformStats.length > 0 ? `
            <div class="bar-chart platform-coins-chart">
                ${sortedPlatformStats.slice(0, 10).map(([platform, coins], index) => {
                    const heightPercentage = maxPlatformCoins > 0 ? (coins / maxPlatformCoins) * 85 : 0; // 85% to leave room for label
                    const displayValue = coins >= 1000 ? `${(coins / 1000).toFixed(1)}k` : `${coins}`;
                    const fullValue = `${platform}: ${coins.toLocaleString()} coins`;
                    return `
                    <div class="bar-group" title="${fullValue}">
                        <div class="bar animated-v-bar c${index % 10}" 
                             style="--target-height: ${heightPercentage}%; --animation-delay: ${index * 60}ms;"
                             data-value="${displayValue}">
                        </div>
                        <label title="${platform}">${platform}</label>
                    </div>
                    `;
                }).join('')}
            </div>
            ${sortedPlatformStats.length > 10 ? `<p class="chart-note">Showing top 10 of ${sortedPlatformStats.length} platforms.</p>` : ''}
            ` : `<p class="no-data-message">No coin data available for this month.</p>`}
        </div>

        <div class="content-block" style="margin-top: 1.5rem;">
             <div class="table-header">
                <h2>Monthly Entries</h2>
                 <div class="filters">
                    <div class="filter-group-inline">
                        <label for="rows-per-page">Show</label>
                        <select id="rows-per-page" class="form-control">
                            ${[10, 25, 50].map(val => createOption(String(val), String(rowsPerPage))).join('')}
                        </select>
                    </div>
                    ${APP_STATE.role === 'Admin' ? `<button class="btn btn-danger" id="delete-all-monthly" ${monthlyEntries.length === 0 ? 'disabled' : ''}><i class="fa-solid fa-triangle-exclamation"></i> Delete All Monthly Entries</button>` : ''}
                </div>
            </div>
            <div id="monthly-table"></div>
            ${totalEntries > 0 ? `
            <div class="pagination-controls">
                <button id="prev-page" class="btn">Previous</button>
                <span>Page ${currentPage} of ${totalPages}</span>
                <button id="next-page" class="btn">Next</button>
            </div>
            ` : ''}
        </div>
    `;

    container.querySelector('#month-filter')?.addEventListener('change', e => handleFilterChange('monthly', 'month', (e.target as HTMLInputElement).value));
    container.querySelector('#export-monthly')?.addEventListener('click', () => exportToCsv(monthlyEntries, `monthly_report_${month}`));
    
    if (APP_STATE.role === 'Admin') {
        const deleteAllBtn = container.querySelector<HTMLButtonElement>('#delete-all-monthly');
        deleteAllBtn?.addEventListener('click', () => {
            if (!deleteAllBtn.disabled) {
                openModal('deleteAllMonthly', month)
            }
        });
    }

    container.querySelector('#rows-per-page')?.addEventListener('change', e => {
        const newRows = parseInt((e.target as HTMLSelectElement).value, 10);
        handleFilterChange('monthly', 'rowsPerPage', newRows);
    });

    const prevBtn = container.querySelector<HTMLButtonElement>('#prev-page');
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => handleFilterChange('monthly', 'currentPage', currentPage - 1));
    }

    const nextBtn = container.querySelector<HTMLButtonElement>('#next-page');
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.addEventListener('click', () => handleFilterChange('monthly', 'currentPage', currentPage + 1));
    }

    const headers = ['Date', 'Agent', 'Username', 'Amount', 'Category', 'Platform'];
    const rows = paginatedEntries.map(e => [formatDate(e.date), e.agentName, e.username, formatCurrency(e.amount), `<span class="tag ${e.category.toLowerCase()}">${e.category}</span>`, e.platform, e]);
    const actions = (entry: Entry) => `
        <button class="btn-icon" onclick="openModal('edit', ${JSON.stringify(entry).replace(/"/g, '&quot;')})" title="Edit"><i class="fa-solid fa-pencil"></i></button>
        <button class="btn-icon btn-icon-danger" onclick="openModal('delete', ${entry.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
    `;
    container.querySelector('#monthly-table')!.innerHTML = createTable(headers, rows, actions);
    
    return container;
}

function createReferralReport(): HTMLElement {
    const container = document.createElement('div');
    const { code, compareCode, startDate, endDate, currentPage, rowsPerPage } = APP_STATE.filters.referral;

    const businessEntries = APP_STATE.entries.filter(e => e.businessId === APP_STATE.currentBusiness!.id);

    // --- DATA FILTERING & AGGREGATION ---
    const filteredEntries = businessEntries.filter(e => {
        const entryDate = new Date(e.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return e.referralCode === code && entryDate >= start && entryDate <= end;
    });

    const compareEntries = compareCode ? businessEntries.filter(e => {
        const entryDate = new Date(e.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return e.referralCode === compareCode && entryDate >= start && entryDate <= end;
    }) : [];

    // --- SUMMARY CARD STATS ---
    const totalRecharge = filteredEntries.filter(e => e.category === 'Recharge').reduce((sum, e) => sum + e.amount, 0);
    const totalFreeplay = filteredEntries.filter(e => e.category === 'Freeplay').reduce((sum, e) => sum + e.amount, 0);
    const newPaidCount = filteredEntries.filter(e => e.redeemType === 'New Paid').length;
    const alreadyPaidCount = filteredEntries.filter(e => e.redeemType === 'Already Paid').length;
    const totalEntriesCount = filteredEntries.length;
    const platformCounts = filteredEntries.reduce((acc, e) => { acc[e.platform] = (acc[e.platform] || 0) + 1; return acc; }, {} as Record<string, number>);
    const mostUsedPlatforms = Object.entries(platformCounts).sort((a,b) => b[1] - a[1]).slice(0, 2).map(p => p[0]);
    const avgRecharge = totalEntriesCount > 0 ? totalRecharge / totalEntriesCount : 0;

    // --- CHART DATA ---
    const paidStatusData = { 'New Paid': newPaidCount, 'Already Paid': alreadyPaidCount };
    const dailyRechargeData = filteredEntries.filter(e => e.category === 'Recharge').reduce((acc, e) => {
        acc[e.date] = (acc[e.date] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);

    const platformByPageData = filteredEntries.reduce((acc, e) => {
        if (!acc[e.pageName]) acc[e.pageName] = {};
        acc[e.pageName][e.platform] = (acc[e.pageName][e.platform] || 0) + 1;
        return acc;
    }, {} as Record<PageName, Record<string, number>>);

    // Filter the detailed log to ensure source consistency, addressing the user's request.
    const tableEntries = filteredEntries.filter(e => {
        if (code === 'ADS') {
            return e.source === 'Ads';
        }
        if (code === 'Random') {
            return e.source === 'Random';
        }
        return e.source === 'Referral';
    });

    // --- PAGINATION CALCULATIONS for Detailed Log ---
    const totalTableEntries = tableEntries.length;
    const totalPages = Math.ceil(totalTableEntries / rowsPerPage) || 1;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedEntries = tableEntries.slice(startIndex, startIndex + rowsPerPage);


    // --- RENDER ---
    container.innerHTML = `
        <div class="page-header"><h1>Referral Code Intelligence</h1></div>
        <div class="filter-bar">
            <div class="filter-group">
                <label for="referral-code-filter">Referral Code</label>
                <select id="referral-code-filter">${REFERRAL_CODES.map(c => createOption(c, code)).join('')}</select>
            </div>
            <div class="filter-group">
                <label for="date-start">Date Range</label>
                <div class="date-range">
                    <input type="date" id="date-start" value="${startDate}">
                    <span>to</span>
                    <input type="date" id="date-end" value="${endDate}">
                </div>
            </div>
             <div class="filter-group">
                <label for="referral-compare-filter">Compare With</label>
                <select id="referral-compare-filter">
                    <option value="">None</option>
                    ${REFERRAL_CODES.filter(c => c !== code).map(c => createOption(c, compareCode)).join('')}
                </select>
            </div>
            <div class="filter-pills">
                <span class="pill">Code: <strong>${code}</strong></span>
                ${compareCode ? `<span class="pill">Comparing: <strong>${compareCode}</strong></span>` : ''}
            </div>
        </div>
        
        <div class="stats-grid-referral">
            <div class="stat-card mini"><div class="card-header"><h3>Total Recharge</h3></div><div class="value">${formatCurrency(totalRecharge)}</div></div>
            <div class="stat-card mini"><div class="card-header"><h3>Total Freeplay</h3></div><div class="value">${formatCurrency(totalFreeplay)}</div></div>
            <div class="stat-card mini"><div class="card-header"><h3>New Paid</h3></div><div class="value">${newPaidCount}</div></div>
            <div class="stat-card mini"><div class="card-header"><h3>Already Paid</h3></div><div class="value">${alreadyPaidCount}</div></div>
            <div class="stat-card mini"><div class="card-header"><h3>Total Entries</h3></div><div class="value">${totalEntriesCount}</div></div>
            <div class="stat-card mini"><div class="card-header"><h3>Avg. Recharge</h3></div><div class="value">${formatCurrency(avgRecharge)}</div></div>
        </div>

        <div class="grid-2 chart-grid">
            <div class="content-block"><h2>Recharge vs Freeplay</h2><div id="bar-chart-container"></div></div>
            <div class="content-block"><h2>New vs Already Paid</h2><div id="pie-chart-container"></div></div>
            <div class="content-block full-width"><h2>Daily Recharge Trend</h2><div id="line-chart-container"></div></div>
            <div class="content-block"><h2>Platform Usage by Page</h2><div id="stacked-chart-container"></div></div>
        </div>

        <div class="content-block">
            <div class="table-header">
                <h2>Detailed Log</h2>
                <div class="filters">
                    <div class="filter-group-inline">
                        <label for="rows-per-page-referral">Show</label>
                        <select id="rows-per-page-referral" class="form-control">
                             ${[10, 25, 50].map(val => createOption(String(val), String(rowsPerPage))).join('')}
                        </select>
                    </div>
                    <button class="btn" id="export-referral"><i class="fa-solid fa-download"></i> Export CSV</button>
                </div>
            </div>
            <div id="referral-table"></div>
             ${totalTableEntries > 0 ? `
            <div class="pagination-controls">
                <button id="prev-page-referral" class="btn">Previous</button>
                <span>Page ${currentPage} of ${totalPages}</span>
                <button id="next-page-referral" class="btn">Next</button>
            </div>
            ` : ''}
        </div>
    `;

    // --- CHARTS RENDERING ---
    // Bar Chart
    const barChartContainer = container.querySelector('#bar-chart-container')!;
    barChartContainer.innerHTML = `
        <div class="bar-chart">
            <div class="bar-group">
                <div class="bar recharge" style="height: ${totalRecharge > 0 ? Math.min(100, (totalRecharge / (totalRecharge + totalFreeplay)) * 100) : 0}%;" data-value="${formatCurrency(totalRecharge)}"></div>
                <label>Recharge</label>
            </div>
            <div class="bar-group">
                <div class="bar freeplay" style="height: ${totalFreeplay > 0 ? Math.min(100, (totalFreeplay / (totalRecharge + totalFreeplay)) * 100) : 0}%;" data-value="${formatCurrency(totalFreeplay)}"></div>
                <label>Freeplay</label>
            </div>
        </div>
    `;
    // Pie Chart
    const pieChartContainer = container.querySelector('#pie-chart-container')!;
    const totalPaid = newPaidCount + alreadyPaidCount;
    pieChartContainer.innerHTML = `
        <div class="pie-chart-container">
            <div class="pie-chart" style="--total: ${totalPaid}; --p1: ${newPaidCount}; --c1: var(--success-green); --p2: ${alreadyPaidCount}; --c2: var(--inactive-gray);"></div>
            <ul class="chart-legend">
                <li><span class="legend-color" style="background-color: var(--success-green);"></span>New Paid (${totalPaid > 0 ? (newPaidCount/totalPaid * 100).toFixed(1) : 0}%)</li>
                <li><span class="legend-color" style="background-color: var(--inactive-gray);"></span>Already Paid (${totalPaid > 0 ? (alreadyPaidCount/totalPaid * 100).toFixed(1) : 0}%)</li>
            </ul>
        </div>
    `;
    // Line Chart
    const lineChartContainer = container.querySelector('#line-chart-container')!;
    const sortedDates = Object.keys(dailyRechargeData).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    const maxVal = Math.max(...Object.values(dailyRechargeData), 1);
    const points = sortedDates.map((date, i) => {
        const x = (i / (sortedDates.length - 1 || 1)) * 100;
        const y = 100 - (dailyRechargeData[date] / maxVal) * 90; // 90 to leave margin
        return `${x},${y}`;
    }).join(' ');
    lineChartContainer.innerHTML = `
        <svg class="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
             <polyline fill="none" stroke="var(--primary-cta)" stroke-width="0.5" points="${points}" vector-effect="non-scaling-stroke"></polyline>
        </svg>
    `;
    // Stacked Chart
    const stackedChartContainer = container.querySelector('#stacked-chart-container')!;
    let stackedHtml = '<div class="stacked-bar-chart">';
    for (const pageName in platformByPageData) {
        const platforms = platformByPageData[pageName as PageName];
        const total = Object.values(platforms).reduce((s, c) => s + c, 0);
        stackedHtml += `<div class="stacked-bar-group"><label>${pageName}</label><div class="stacked-bar">`;
        let i = 0;
        for (const platform in platforms) {
            const count = platforms[platform as Platform];
            const percentage = (count/total) * 100;
            stackedHtml += `<div class="stack-segment c${i++ % 4}" style="width: ${percentage}%" title="${platform}: ${count}"></div>`;
        }
        stackedHtml += '</div></div>';
    }
    stackedHtml += '</div>';
    stackedChartContainer.innerHTML = stackedHtml;

    // --- EVENT LISTENERS ---
    container.querySelector('#referral-code-filter')?.addEventListener('change', e => handleFilterChange('referral', 'code', (e.target as HTMLSelectElement).value));
    container.querySelector('#referral-compare-filter')?.addEventListener('change', e => handleFilterChange('referral', 'compareCode', (e.target as HTMLSelectElement).value));
    container.querySelector('#date-start')?.addEventListener('change', e => handleFilterChange('referral', 'startDate', (e.target as HTMLInputElement).value));
    container.querySelector('#date-end')?.addEventListener('change', e => handleFilterChange('referral', 'endDate', (e.target as HTMLInputElement).value));
    container.querySelector('#export-referral')?.addEventListener('click', () => exportToCsv(tableEntries, `referral_log_${code}`));

    // Pagination listeners
    container.querySelector('#rows-per-page-referral')?.addEventListener('change', e => {
        const newRows = parseInt((e.target as HTMLSelectElement).value, 10);
        handleFilterChange('referral', 'rowsPerPage', newRows);
    });
    const prevBtn = container.querySelector<HTMLButtonElement>('#prev-page-referral');
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => handleFilterChange('referral', 'currentPage', currentPage - 1));
    }
    const nextBtn = container.querySelector<HTMLButtonElement>('#next-page-referral');
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.addEventListener('click', () => handleFilterChange('referral', 'currentPage', currentPage + 1));
    }


    // --- TABLE ---
    const headers = ['Date', 'Agent', 'Username', 'Platform', 'Page', 'Recharge', 'Freeplay', 'Status', 'Source', 'Payment'];
    const rows = paginatedEntries.map(e => [
        formatDate(e.date), e.agentName, e.username, e.platform, e.pageName,
        e.category === 'Recharge' ? formatCurrency(e.amount) : formatCurrency(0),
        e.category === 'Freeplay' ? formatCurrency(e.amount) : formatCurrency(0),
        `<span class="tag ${e.redeemType === 'New Paid' ? 'new-paid' : 'already-paid'}">${e.redeemType}</span>`,
        e.source, e.paymentMethod, e
    ]);
     const actions = (entry: Entry) => `
        <button class="btn-icon" onclick="openModal('edit', ${JSON.stringify(entry).replace(/"/g, '&quot;')})" title="Edit"><i class="fa-solid fa-pencil"></i></button>
        <button class="btn-icon btn-icon-danger" onclick="openModal('delete', ${entry.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
    `;
    container.querySelector('#referral-table')!.innerHTML = createTable(headers, rows, actions);

    return container;
}


function createAgentProgress(): HTMLElement {
    const container = document.createElement('div');
    const { filterType, startDate, endDate } = APP_STATE.filters.progress;
    
    const businessEntries = APP_STATE.entries.filter(e => e.businessId === APP_STATE.currentBusiness!.id);
    const businessAgents = APP_STATE.managedAgents.filter(a => a.businessId === APP_STATE.currentBusiness!.id);

    // Filter entries based on the selected date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const filteredEntries = businessEntries.filter(e => {
        const entryDate = new Date(e.date);
        return entryDate >= start && entryDate <= end;
    });

    // --- ORIGINAL CALCULATIONS ---
    const agentData = businessAgents.map(agent => {
        const entries = filteredEntries.filter(e => e.agentName === agent.agentName);
        const recharge = entries.filter(e => e.category === 'Recharge').reduce((sum, e) => sum + e.amount, 0);
        const points = entries.reduce((sum, e) => sum + e.pointsLoad, 0);
        return { name: agent.agentName, recharge, points };
    }).sort((a, b) => b.recharge - a.recharge);

    const paymentData = filteredEntries.reduce((acc, e) => {
        if (e.category === 'Recharge') {
           acc[e.paymentMethod] = (acc[e.paymentMethod] || 0) + 1;
        }
        return acc;
    }, {} as Record<PaymentMethod, number>);
    const totalPayments = Object.values(paymentData).reduce((sum, v) => sum + v, 0);
    
    // --- ADVANCED INSIGHTS CALCULATIONS ---
    const getMostFrequent = <T extends string>(arr: T[]): T | 'N/A' => {
        if (arr.length === 0) return 'N/A';
        const counts = arr.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) as T;
    };

    const advancedAgentStats = businessAgents.map(agent => {
        const agentEntries = filteredEntries.filter(e => e.agentName === agent.agentName);
        const rechargeEntries = agentEntries.filter(e => e.category === 'Recharge');
        const freeplayEntries = agentEntries.filter(e => e.category === 'Freeplay');

        const totalRecharge = rechargeEntries.reduce((sum, e) => sum + e.amount, 0);
        const freeplayGiven = freeplayEntries.reduce((sum, e) => sum + e.amount, 0);
        const totalPlayersServed = new Set(agentEntries.map(e => e.username)).size;
        
        const platform = getMostFrequent(agentEntries.map(e => e.platform));
        const referralCodeUsed = getMostFrequent(agentEntries.map(e => e.referralCode));
        const pageNameSource = getMostFrequent(agentEntries.map(e => e.pageName));

        const pageBreakdownData = rechargeEntries.reduce((acc, entry) => {
            acc[entry.pageName] = (acc[entry.pageName] || 0) + entry.amount;
            return acc;
        }, {} as Record<PageName, number>);

        const pageBreakdown = Object.entries(pageBreakdownData)
            .map(([pageName, totalRecharge]) => ({ pageName: pageName as PageName, totalRecharge }))
            .sort((a, b) => b.totalRecharge - a.totalRecharge);
            
        const platformBreakdownData = rechargeEntries.reduce((acc, entry) => {
            acc[entry.platform] = (acc[entry.platform] || 0) + 1;
            return acc;
        }, {} as Record<Platform, number>);

        const platformBreakdown = Object.entries(platformBreakdownData)
            .map(([platform, rechargeCount]) => ({ platform: platform as Platform, rechargeCount }))
            .sort((a, b) => b.rechargeCount - a.rechargeCount);

        const referralBreakdownData = rechargeEntries.reduce((acc, entry) => {
            if (!acc[entry.referralCode]) {
                acc[entry.referralCode] = { players: new Set(), totalRecharge: 0 };
            }
            acc[entry.referralCode].players.add(entry.username);
            acc[entry.referralCode].totalRecharge += entry.amount;
            return acc;
        }, {} as Record<string, { players: Set<string>, totalRecharge: number }>);

        const referralBreakdown = Object.entries(referralBreakdownData)
            .map(([referralCode, data]) => ({
                referralCode: referralCode as ReferralCode,
                playerCount: data.players.size,
                totalRecharge: data.totalRecharge
            }))
            .sort((a, b) => b.totalRecharge - a.totalRecharge);

        return {
            "Agent Name": agent.agentName,
            "Total Recharge": totalRecharge,
            "Freeplay Given": freeplayGiven,
            "Platform": platform,
            "Recharge Count": rechargeEntries.length,
            "Freeplay Count": freeplayEntries.length,
            "Total Players Served": totalPlayersServed,
            "Referral Code Used": referralCodeUsed,
            "Page Name / Source": pageNameSource,
            "pageBreakdown": pageBreakdown,
            "platformBreakdown": platformBreakdown,
            "referralBreakdown": referralBreakdown,
        };
    }).sort((a, b) => b["Total Recharge"] - a["Total Recharge"]);

    // --- HTML STRUCTURE ---
    const filterBarHTML = `
        <div class="filter-bar" style="margin-bottom: 2rem;">
            <div class="filter-group">
                <label>Date Range</label>
                <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">
                    <div class="button-group">
                        <button id="filter-7days" class="btn-filter ${filterType === '7days' ? 'active' : ''}">Last 7 Days</button>
                        <button id="filter-15days" class="btn-filter ${filterType === '15days' ? 'active' : ''}">Last 15 Days</button>
                        <button id="filter-month" class="btn-filter ${filterType === 'month' ? 'active' : ''}">This Month</button>
                        <button id="filter-custom-btn" class="btn-filter ${filterType === 'custom' ? 'active' : ''}">Custom</button>
                    </div>
                    <div id="custom-date-filter-group" class="filter-group date-range ${filterType !== 'custom' ? 'hidden' : ''}" style="flex-direction: row; align-items: center; gap: 0.5rem;">
                         <input type="date" id="progress-start-date" value="${startDate}">
                         <span>to</span>
                         <input type="date" id="progress-end-date" value="${endDate}">
                    </div>
                </div>
            </div>
        </div>
    `;

    const topPerformer = agentData.length > 0 && agentData[0].recharge > 0 ? agentData[0] : null;
    const topPerformerHTML = `
        <div class="top-performer-card">
            <div class="card-content">
                <i class="fa-solid fa-trophy"></i>
                <h4 class="subtitle">Top Performer – Most Recharge This Period</h4>
                ${topPerformer ? `
                    <div class="agent-name">${topPerformer.name}</div>
                    <div class="recharge-amount">${formatCurrency(topPerformer.recharge)}</div>
                ` : `
                    <div class="agent-name" style="color: var(--inactive-gray); font-size: 1.25rem;">No Performer Yet</div>
                    <div class="recharge-amount" style="font-size: 1rem; color: var(--inactive-gray); margin-top: 0.5rem; font-weight: 500;">No recharge data available for this period.</div>
                `}
            </div>
        </div>
    `;

    const advancedTableHTML = `
        <div class="content-block" style="margin-top: 2rem;">
            <div class="table-header">
                <h2>Advanced Agent Insight</h2>
                <div class="filters">
                    <input type="search" id="agent-search" placeholder="Search agents..." class="form-control">
                    <button class="btn" id="export-advanced"><i class="fa-solid fa-download"></i> Export</button>
                </div>
            </div>
            <div class="table-container">
                <table id="advanced-agent-table">
                    <thead>
                        <tr>
                            <th>Agent</th>
                            <th>Total Recharge</th>
                            <th>Freeplay Given</th>
                            <th>Top Platform</th>
                            <th>Recharge Count</th>
                            <th>Freeplay Count</th>
                            <th>Players Served</th>
                            <th>Top Referral</th>
                            <th>Top Page</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    container.innerHTML = `
        <div class="page-header"><h1>Agent Progress</h1></div>
        ${filterBarHTML}
        ${topPerformerHTML}
        <div class="grid-2">
            <div class="content-block">
                <h2>Agent Leaderboard (by Recharge)</h2>
                ${agentData.length === 0 ? `<p class="no-data-message">No agents registered.</p>` : (filteredEntries.length === 0 ? `<p class="no-data-message">No data for this period.</p>` : `
                <ol class="leaderboard">
                    ${agentData.map((a, i) => `
                        <li>
                            <span class="rank">${i+1}</span>
                            <span class="name">${a.name}</span>
                            <span class="score">${formatCurrency(a.recharge)}</span>
                        </li>
                    `).join('')}
                </ol>
                `)}
            </div>
            <div class="content-block">
                <h2>Overall Payment Methods</h2>
                 ${filteredEntries.length === 0 ? `<p class="no-data-message">No data for this period.</p>` : `
                <div class="pie-chart-container">
                    <div class="pie-chart" style="--total: ${totalPayments}; ${Object.entries(paymentData).map(([key, value], i) => `--p${i+1}:${value}; --c${i+1}:${['#10FF88', '#FFD600', '#3B82F6', '#EF4444'][i%4]};`).join(' ')}"></div>
                    <ul class="chart-legend">
                        ${Object.entries(paymentData).map(([key, value], i) => `<li><span class="legend-color" style="background-color: var(--c${i+1});"></span>${key} (${totalPayments > 0 ? ((value/totalPayments)*100).toFixed(1) : 0}%)</li>`).join('')}
                    </ul>
                </div>
                `}
            </div>
        </div>
        ${advancedTableHTML}
    `;

    // --- EVENT LISTENERS AND DYNAMIC RENDERING ---

    // Date filters (original)
    const handleFilterClick = (type: ProgressFilterType) => {
        const today = new Date();
        let newStartDate = APP_STATE.filters.progress.startDate;
        let newEndDate = APP_STATE.filters.progress.endDate;

        if (type !== 'custom') {
            newEndDate = today.toISOString().split('T')[0];
            if (type === 'month') {
                newStartDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            } else {
                const daysAgo = type === '7days' ? 6 : 14;
                const startDateObj = new Date();
                startDateObj.setDate(startDateObj.getDate() - daysAgo);
                newStartDate = startDateObj.toISOString().split('T')[0];
            }
        }
        
        setState({
            filters: { ...APP_STATE.filters, progress: { filterType: type, startDate: newStartDate, endDate: newEndDate } }
        });
    };
    const handleDateChange = (part: 'startDate' | 'endDate', value: string) => {
        const newDates = { ...APP_STATE.filters.progress };
        newDates[part] = value;
        setState({
            filters: { ...APP_STATE.filters, progress: { ...newDates, filterType: 'custom' } }
        });
    }
    container.querySelector('#filter-7days')?.addEventListener('click', () => handleFilterClick('7days'));
    container.querySelector('#filter-15days')?.addEventListener('click', () => handleFilterClick('15days'));
    container.querySelector('#filter-month')?.addEventListener('click', () => handleFilterClick('month'));
    container.querySelector('#filter-custom-btn')?.addEventListener('click', () => handleFilterClick('custom'));
    container.querySelector('#progress-start-date')?.addEventListener('change', e => handleDateChange('startDate', (e.target as HTMLInputElement).value));
    container.querySelector('#progress-end-date')?.addEventListener('change', e => handleDateChange('endDate', (e.target as HTMLInputElement).value));

    // Advanced table rendering and listeners
    const renderAdvancedTable = (dataToRender: typeof advancedAgentStats) => {
        const tableBody = container.querySelector('#advanced-agent-table tbody');
        if (!tableBody) return;

        if (dataToRender.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10" class="no-data-message">No agent data found for this search or period.</td></tr>`;
            return;
        }

        tableBody.innerHTML = dataToRender.map(stat => {
            const originalRank = advancedAgentStats.findIndex(s => s['Agent Name'] === stat['Agent Name']);
            let rowClass = '';
            if (originalRank === 0 && stat['Total Recharge'] > 0) rowClass = 'top-agent-row-1';
            else if (originalRank === 1 && stat['Total Recharge'] > 0) rowClass = 'top-agent-row-2';
            else if (originalRank === 2 && stat['Total Recharge'] > 0) rowClass = 'top-agent-row-3';
            
            const pageBreakdownData = { agentName: stat['Agent Name'], breakdown: stat.pageBreakdown };
            const platformBreakdownPayload = { agentName: stat['Agent Name'], breakdown: stat.platformBreakdown };
            const referralBreakdownPayload = { agentName: stat['Agent Name'], breakdown: stat.referralBreakdown };

            return `
                <tr class="${rowClass}">
                    <td data-label="Agent" style="text-transform: capitalize;">${stat['Agent Name']}</td>
                    <td data-label="Total Recharge">${formatCurrency(stat['Total Recharge'])}</td>
                    <td data-label="Freeplay Given">${formatCurrency(stat['Freeplay Given'])}</td>
                    <td data-label="Top Platform">
                        <div class="cell-with-action">
                             <span>${stat.Platform}</span>
                            <button class="btn-icon btn-icon-info" onclick='openModal("agentPlatformBreakdown", ${JSON.stringify(platformBreakdownPayload).replace(/'/g, "&apos;").replace(/"/g, "&quot;")})' title="View Breakdown" ${stat.platformBreakdown.length === 0 ? 'disabled' : ''}><i class="fa-solid fa-eye"></i></button>
                        </div>
                    </td>
                    <td data-label="Recharge Count">${stat['Recharge Count']}</td>
                    <td data-label="Freeplay Count">${stat['Freeplay Count']}</td>
                    <td data-label="Players Served">${stat['Total Players Served']}</td>
                    <td data-label="Top Referral">
                       <div class="cell-with-action">
                           <span>${stat['Referral Code Used']}</span>
                           <button class="btn-icon btn-icon-info" onclick='openModal("agentReferralBreakdown", ${JSON.stringify(referralBreakdownPayload).replace(/'/g, "&apos;").replace(/"/g, "&quot;")})' title="View Breakdown" ${stat.referralBreakdown.length === 0 ? 'disabled' : ''}><i class="fa-solid fa-eye"></i></button>
                       </div>
                    </td>
                    <td data-label="Top Page">
                        <div class="cell-with-action">
                            <span>${stat['Page Name / Source']}</span>
                            <button class="btn-icon btn-icon-info" onclick='openModal("agentPageBreakdown", ${JSON.stringify(pageBreakdownData).replace(/'/g, "&apos;").replace(/"/g, "&quot;")})' title="View Breakdown" ${stat.pageBreakdown.length === 0 ? 'disabled' : ''}><i class="fa-solid fa-eye"></i></button>
                        </div>
                    </td>
                    <td data-label="Actions" class="table-actions">
                         <button class="btn-icon" title="View Details"><i class="fa-solid fa-eye"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    };
    renderAdvancedTable(advancedAgentStats);

    container.querySelector('#export-advanced')?.addEventListener('click', () => exportToCsv(advancedAgentStats.map(s => { const {"pageBreakdown":_, "platformBreakdown": __, "referralBreakdown": ___, ...rest} = s; return rest; }), `advanced_agent_insight_${startDate}_to_${endDate}`));
    container.querySelector('#agent-search')?.addEventListener('input', (e) => {
        const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
        const filteredData = advancedAgentStats.filter(stat => stat['Agent Name'].toLowerCase().includes(searchTerm));
        renderAdvancedTable(filteredData);
    });

    return container;
}

function createUploadCsv(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="page-header"><h1>Upload CSV</h1></div>
        <div class="content-block">
            <div id="drop-zone">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <p><strong>Drag & Drop</strong> your CSV file here</p>
                <span>or</span>
                <button class="btn" id="browse-btn">Browse Files</button>
                <input type="file" id="file-input" accept=".csv" hidden>
            </div>
            <div id="file-preview" class="hidden">
                <h3>File Preview</h3>
                <div class="file-info">
                    <p><strong>File:</strong> <span id="file-name"></span></p>
                    <p><strong>Rows:</strong> <span id="row-count"></span></p>
                </div>
                <div class="upload-options">
                    <h4>Import Options</h4>
                    <label><input type="radio" name="upload-option" value="merge" checked> Merge with existing data</label>
                    <label><input type="radio" name="upload-option" value="overwrite"> Overwrite all existing data</label>
                </div>
                <div class="form-actions">
                    <button class="btn" id="cancel-upload">Cancel</button>
                    <button class="btn btn-primary" id="process-upload">Process File</button>
                </div>
            </div>
        </div>
    `;

    const dropZone = container.querySelector('#drop-zone')!;
    const fileInput = container.querySelector('#file-input') as HTMLInputElement;
    const browseBtn = container.querySelector<HTMLButtonElement>('#browse-btn')!;
    const filePreview = container.querySelector('#file-preview')!;
    const fileNameEl = container.querySelector('#file-name')!;
    const rowCountEl = container.querySelector('#row-count')!;

    const handleFile = (file: File) => {
        dropZone.classList.add('hidden');
        filePreview.classList.remove('hidden');
        fileNameEl.textContent = file.name;
        // Simulate reading file
        rowCountEl.textContent = `${Math.floor(Math.random() * 200) + 50}`; 
    };

    browseBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleFile(file);
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, e => e.preventDefault()));
    ['dragenter', 'dragover'].forEach(eventName => dropZone.addEventListener(eventName, () => dropZone.classList.add('hover')));
    ['dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, () => dropZone.classList.remove('hover')));
    
    dropZone.addEventListener('drop', (e) => {
        const file = (e as DragEvent).dataTransfer?.files[0];
        if (file) handleFile(file);
    });

    container.querySelector('#cancel-upload')?.addEventListener('click', () => {
        dropZone.classList.remove('hidden');
        filePreview.classList.add('hidden');
        fileInput.value = '';
    });

    container.querySelector('#process-upload')?.addEventListener('click', () => {
        showAlert('File processed successfully (simulation).', 'success');
        dropZone.classList.remove('hidden');
        filePreview.classList.add('hidden');
        fileInput.value = '';
    });
    return container;
}

function createSettingsPage(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = `<div class="page-header"><h1>Entry Field Settings</h1></div>`;

    const accordionContainer = document.createElement('div');
    accordionContainer.className = 'settings-accordion-container';

    const createSettingsAccordionItem = (title: string, stateKey: keyof AppState['settings'], singularName: string) => {
        const items = APP_STATE.settings[stateKey];
        const itemElement = document.createElement('div');
        itemElement.className = 'setting-accordion-item';

        itemElement.innerHTML = `
            <button class="setting-accordion-header" aria-expanded="false">
                <h2 class="setting-accordion-title">${title}</h2>
                <i class="fas fa-chevron-down accordion-icon"></i>
            </button>
            <div class="setting-accordion-content">
                <div class="setting-accordion-content-inner">
                    <ul class="settings-list">
                        ${items.length > 0 ? items.map((item, index) => `
                            <li>
                                <span>${item}</span>
                                <div class="settings-actions">
                                    <button class="btn-icon" onclick="openModal('editSetting', ${JSON.stringify({key: stateKey, index, currentValue: item, singularName}).replace(/"/g, '&quot;')})" title="Edit"><i class="fa-solid fa-pencil"></i></button>
                                    <button class="btn-icon btn-icon-danger" onclick="openModal('deleteSetting', ${JSON.stringify({key: stateKey, index, currentValue: item}).replace(/"/g, '&quot;')})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </li>
                        `).join('') : '<li class="no-data-message">No items found.</li>'}
                    </ul>
                    <div class="form-actions">
                         <button class="btn btn-primary" onclick="openModal('addSetting', ${JSON.stringify({key: stateKey, singularName}).replace(/"/g, '&quot;')})"><i class="fa-solid fa-plus"></i> Add New ${singularName}</button>
                    </div>
                </div>
            </div>
        `;

        const header = itemElement.querySelector('.setting-accordion-header') as HTMLButtonElement;
        const content = itemElement.querySelector('.setting-accordion-content') as HTMLElement;

        header.addEventListener('click', () => {
            const isOpen = itemElement.classList.toggle('open');
            header.setAttribute('aria-expanded', String(isOpen));
            if (isOpen) {
                content.style.maxHeight = content.scrollHeight + 'px';
            } else {
                content.style.maxHeight = '0px';
            }
        });

        return itemElement;
    };

    accordionContainer.appendChild(createSettingsAccordionItem('Manage Page Names', 'pageNames', 'Page Name'));
    accordionContainer.appendChild(createSettingsAccordionItem('Manage Platforms', 'platforms', 'Platform'));
    accordionContainer.appendChild(createSettingsAccordionItem('Manage Payment Methods', 'paymentMethods', 'Payment Method'));
    accordionContainer.appendChild(createSettingsAccordionItem('Manage Player History Options', 'playerHistories', 'Player History Option'));

    container.appendChild(accordionContainer);
    return container;
}

function createManageAgentsPage(): HTMLElement {
    const container = document.createElement('div');
    const businessAgents = APP_STATE.managedAgents.filter(a => a.businessId === APP_STATE.currentBusiness!.id);

    container.innerHTML = `
        <div class="page-header"><h1><i class="fa-solid fa-users-cog"></i> Manage Agents</h1></div>
        
        <div class="content-block">
            <h2>Register New Agent</h2>
            <form id="register-agent-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="agent-name">Agent Name</label>
                        <input type="text" id="agent-name" placeholder="e.g., John Doe" required>
                    </div>
                    <div class="form-group">
                        <label for="agent-username">Username or Email</label>
                        <input type="text" id="agent-username" placeholder="e.g., johndoe@example.com" required>
                    </div>
                    <div class="form-group">
                        <label for="agent-password">Password</label>
                        <input type="password" id="agent-password" placeholder="Min. 6 characters" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label for="agent-role">Assign Role</label>
                        <select id="agent-role" required>${AGENT_ACCESS_ROLES.map(r => createOption(r)).join('')}</select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Register Agent</button>
                </div>
            </form>
        </div>

        <div class="content-block">
            <h2>Registered Agents List (${businessAgents.length})</h2>
            <div id="agents-table-container"></div>
        </div>
    `;

    const form = container.querySelector('#register-agent-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const agentData: Omit<ManagedAgent, 'id' | 'status' | 'businessId'> = {
            agentName: (form.querySelector('#agent-name') as HTMLInputElement).value,
            username: (form.querySelector('#agent-username') as HTMLInputElement).value,
            password: (form.querySelector('#agent-password') as HTMLInputElement).value,
            role: (form.querySelector('#agent-role') as HTMLSelectElement).value as AgentAccessRole,
        };
        handleRegisterAgent(agentData);
        form.reset();
    });

    const headers = ['Agent Name', 'Username/Email', 'Assigned Role', 'Status', 'Actions'];
    const rows = businessAgents.map(agent => {
        const statusToggle = `
            <label class="status-toggle">
                <input type="checkbox" ${agent.status === 'active' ? 'checked' : ''} onchange="handleUpdateAgentStatus('${agent.id}', this.checked)">
                <span class="slider round"></span>
            </label>
        `;
        // Pass a version of the agent object without the password to the client-side modals
        const { password, ...safeAgent } = agent;
        return [
            `<span style="text-transform: capitalize;">${agent.agentName}</span>`,
            agent.username,
            agent.role,
            statusToggle,
            safeAgent
        ];
    });

    const actions = (agent: ManagedAgent) => `
        <button class="btn-icon" onclick="openModal('editAgent', ${JSON.stringify(agent).replace(/"/g, '&quot;')})" title="Edit"><i class="fa-solid fa-pencil"></i></button>
        <button class="btn-icon" onclick="openModal('resetAgentPassword', ${JSON.stringify(agent).replace(/"/g, '&quot;')})" title="Reset Password"><i class="fa-solid fa-key"></i></button>
        <button class="btn-icon btn-icon-danger" onclick="openModal('deleteAgent', ${JSON.stringify(agent).replace(/"/g, '&quot;')})" title="Delete"><i class="fa-solid fa-trash"></i></button>
    `;

    container.querySelector('#agents-table-container')!.innerHTML = createTable(headers, rows, actions);

    return container;
}


// --- MAIN RENDER FUNCTION ---
function render() {
    root.innerHTML = '';
    const { currentPage, currentBusiness, role } = APP_STATE;

    document.body.querySelector('.modal-overlay')?.remove();

    const modal = createModalComponent();
    window.openModal = openModal;
    window.handleUpdateAgentStatus = handleUpdateAgentStatus;
    window.closeModal = () => {
        document.body.querySelector('.modal-overlay')?.remove();
        closeModal(); // This is the state-updating function
    };

    if (!currentBusiness) {
        // STAGE 1: No business logged in. Show public pages.
        let publicPageElement: HTMLElement;
        switch (currentPage) {
            case 'home':
                publicPageElement = createHomePage();
                break;
            case 'login':
                publicPageElement = createBusinessLoginPage();
                break;
            case 'registerBusiness':
                publicPageElement = createRegisterBusinessPage();
                break;
            default:
                navigateTo('home');
                return; 
        }
        root.appendChild(publicPageElement);
    } else if (!role) {
        // STAGE 2: Business logged in, but role not selected.
        root.appendChild(createRoleSelectionPage());
    } else {
        // STAGE 3: Business and Role selected. Show full dashboard.
        const appContainer = document.createElement('div');
        appContainer.className = 'app-container';
        
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';

        let currentPageElement: HTMLElement;
        switch (currentPage) {
            case 'submit': currentPageElement = createSubmitForm(); break;
            case 'daily': currentPageElement = createDailyReport(); break;
            case 'monthly': currentPageElement = createMonthlyReport(); break;
            case 'referral': currentPageElement = createReferralReport(); break;
            case 'progress': currentPageElement = createAgentProgress(); break;
            case 'upload': currentPageElement = createUploadCsv(); break;
            case 'settings': currentPageElement = createSettingsPage(); break;
            case 'manageAgents': currentPageElement = createManageAgentsPage(); break;
            default:
                navigateTo('daily');
                return;
        }

        mainContent.appendChild(currentPageElement);
        appContainer.append(createSidebar(), mainContent);
        root.appendChild(appContainer);
    }
    
    if (modal) {
        document.body.appendChild(modal);
    }
}


declare global {
    interface Window {
        openModal: (type: ModalState['type'], data: ModalState['data']) => void;
        closeModal: () => void;
        handleUpdateAgentStatus: (id: string, newStatus: boolean) => void;
    }
}


// --- INITIALIZATION ---

// Set up authentication state listener
auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        setState({ 
            isAuthenticated: true, 
            authUser: session.user 
        })
    } else if (event === 'SIGNED_OUT') {
        setState({ 
            isAuthenticated: false, 
            authUser: null,
            currentBusiness: null,
            role: null,
            currentUser: null
        })
        navigateTo('home')
    }
})

document.addEventListener('DOMContentLoaded', render);