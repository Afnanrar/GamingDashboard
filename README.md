# 🎮 Gaming Agent Management System

A comprehensive, multi-tenant dashboard for managing gaming business operations, agent activities, and financial reporting with AI-powered insights.

## ✨ Features

### 🏢 **Business Management**
- Multi-tenant architecture supporting multiple gaming businesses
- Secure business registration and authentication
- Customizable business profiles with logo uploads

### 👥 **Agent Management**
- Role-based access control (Admin, Entry Agent)
- Agent registration with customizable permissions
- Real-time agent status monitoring
- Password management and security

### 📊 **Transaction Tracking**
- **Recharge**: Track player deposits and payments
- **Freeplay**: Monitor promotional credits and bonuses
- **Redeem**: Manage player withdrawals and payouts
- Support for multiple payment methods (Chime, CashApp, Apple Pay, PayPal)

### 📈 **Advanced Reporting**
- **Daily Reports**: Real-time transaction summaries with filtering
- **Monthly Reports**: Comprehensive monthly analytics and trends
- **Referral Reports**: Track referral code performance and ROI
- **Agent Progress**: Individual agent performance metrics and leaderboards

### 🤖 **AI-Powered Insights**
- **Google Gemini Integration**: Automated analysis and recommendations
- **Smart Insights**: Context-aware suggestions for each dashboard section
- **Performance Optimization**: AI-driven recommendations for business growth
- **Trend Analysis**: Automated pattern recognition and forecasting
- **Note**: AI features are optional - the system works completely without Gemini API key

### 🔧 **System Features**
- Responsive design for all devices
- CSV export functionality for all reports
- Advanced filtering and search capabilities
- Real-time data updates
- Secure data handling with encryption

## 🚀 Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Custom CSS with modern design system
- **AI Integration**: Google Gemini AI API
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Secure password hashing with bcrypt
- **Deployment**: Vercel-ready

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- **Google Gemini API key (OPTIONAL)** - System works completely without it

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd gaming-agent-management
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Database Setup
1. Create a new Supabase project
2. Run the SQL script from `supabase_schema.sql` in your Supabase SQL editor
3. Configure your database connection

### 5. Run Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🗄️ Database Schema

### Core Tables
- **`businesses`**: Business account information
- **`managed_agents`**: Agent accounts and permissions
- **`entries`**: Transaction records and gaming data
- **`business_settings`**: Configurable business options
- **`ai_insights`**: Cached AI-generated insights

### Key Features
- UUID-based primary keys for security
- Comprehensive indexing for performance
- Row-level security (RLS) enabled
- Automatic timestamp management
- Referential integrity with cascading deletes

## 🔐 Security Features

- **Password Hashing**: Bcrypt encryption for all passwords
- **Row Level Security**: Database-level access control
- **Input Validation**: Comprehensive form validation
- **XSS Protection**: Secure HTML rendering
- **CSRF Protection**: Built-in security measures

## 📱 User Roles & Permissions

### **Admin**
- Full access to all features
- Agent management and role assignment
- System settings configuration
- Complete reporting access
- Data export capabilities

### **Entry Agent**
- Submit new entries
- View personal submission history
- Limited reporting access
- No system configuration access

## 🚀 Deployment

### Deploy to Vercel

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connect to Vercel**
- Connect your GitHub repository to Vercel
- Set environment variables in Vercel dashboard
- Deploy automatically on push

3. **Environment Variables in Vercel**
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Deploy to Other Platforms

The application is built with Vite and can be deployed to any static hosting platform:
- Netlify
- AWS S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps

## 📊 API Integration

### Google Gemini AI
- Automated insights generation
- Performance analysis
- Trend identification
- Smart recommendations

### Supabase Integration
- Real-time database operations
- Secure authentication
- Scalable data storage
- Advanced querying capabilities

## 🔧 Configuration

### Customizing Business Settings
- Page names for gaming platforms
- Payment method options
- Player history categories
- Platform configurations

### Adding New Features
- Modular component architecture
- Extensible state management
- Plugin-based system design
- API-first development approach

## 📈 Performance Optimization

- **Lazy Loading**: Components load on demand
- **Efficient Queries**: Optimized database queries
- **Caching**: AI insights caching system
- **Compression**: Optimized asset delivery
- **CDN Ready**: Static asset optimization

## 🧪 Testing

### Manual Testing
- Cross-browser compatibility
- Responsive design validation
- User role testing
- Data integrity verification

### Automated Testing
- Unit tests for core functions
- Integration tests for API calls
- E2E tests for user workflows
- Performance testing

## 🐛 Troubleshooting

### Common Issues

1. **Gemini API Errors**
   - Verify API key in environment variables
   - Check API quota and limits
   - Ensure proper API permissions

2. **Database Connection Issues**
   - Verify Supabase credentials
   - Check network connectivity
   - Validate database schema

3. **Build Errors**
   - Clear node_modules and reinstall
   - Check TypeScript configuration
   - Verify Vite configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact: support@branhox.com
- Documentation: [Project Wiki](link-to-wiki)

## 🔮 Roadmap

### Upcoming Features
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Advanced reporting tools
- [ ] Integration with gaming APIs
- [ ] Real-time notifications
- [ ] Advanced user management
- [ ] Backup and recovery systems

### Performance Improvements
- [ ] Database query optimization
- [ ] Frontend bundle optimization
- [ ] CDN integration
- [ ] Advanced caching strategies

---

**Built with ❤️ by the Branhox Gaming Team**

*Empowering gaming businesses with intelligent management solutions*
