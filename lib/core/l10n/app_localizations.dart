import 'package:flutter/foundation.dart';

/// Supported application locales.
enum AppLocale { en, hi, gu }

/// Singleton [ChangeNotifier] that drives the in-app language toggle.
///
/// Usage:
///   AppLocalizations.instance.t('key')   → translated string
///   AppLocalizations.instance.cycleLocale() → EN → हिं → ગુ → EN
class AppLocalizations extends ChangeNotifier {
  AppLocalizations._();
  static final AppLocalizations instance = AppLocalizations._();

  AppLocale _locale = AppLocale.en;
  AppLocale get locale => _locale;

  // Human-readable short label for the current locale (e.g. "EN").
  String get localeLabel => switch (_locale) {
        AppLocale.en => 'EN',
        AppLocale.hi => 'हिं',
        AppLocale.gu => 'ગુ',
      };

  // Human-readable full name for the locale (for dropdowns).
  String get localeFullName => switch (_locale) {
        AppLocale.en => 'English',
        AppLocale.hi => 'हिन्दी',
        AppLocale.gu => 'ગુજરાતી',
      };

  /// Returns the name for any specific locale.
  String nameOf(AppLocale l) => switch (l) {
        AppLocale.en => 'English',
        AppLocale.hi => 'हिन्दी',
        AppLocale.gu => 'ગુજરાતી',
      };

  void setLocale(AppLocale locale) {
    if (_locale == locale) return;
    _locale = locale;
    notifyListeners();
  }

  /// Cycles EN → HI → GU → EN.
  void cycleLocale() {
    final values = AppLocale.values;
    setLocale(values[(values.indexOf(_locale) + 1) % values.length]);
  }

  /// Returns the translated string for [key]. Falls back to English, then
  /// to the raw key if no translation exists.
  String t(String key) {
    final entry = _strings[key];
    if (entry == null) return key;
    return entry[_locale] ?? entry[AppLocale.en] ?? key;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Translation table – all UI strings for every screen & role.
  // ─────────────────────────────────────────────────────────────────────────
  static const Map<String, Map<AppLocale, String>> _strings = {

    // ── Common ──────────────────────────────────────────────────────────────
    'app_name': {
      AppLocale.en: 'Saksham',
      AppLocale.hi: 'सक्षम',
      AppLocale.gu: 'સક્ષમ',
    },
    'secure_access': {
      AppLocale.en: 'SECURE ACCESS GATEWAY',
      AppLocale.hi: 'सुरक्षित पहुँच प्रवेशद्वार',
      AppLocale.gu: 'સુરક્ષિત એક્સેસ ગેટવે',
    },

    // ── Role labels ──────────────────────────────────────────────────────────
    'role_peon': {
      AppLocale.en: 'Peon / Watchman View',
      AppLocale.hi: 'चपरासी / चौकीदार दृश्य',
      AppLocale.gu: 'ચોકીદાર / ચોકીદાર દૃશ્ય',
    },
    'role_principal': {
      AppLocale.en: 'Principal View',
      AppLocale.hi: 'प्रिंसिपल दृश्य',
      AppLocale.gu: 'આચાર્ય દૃશ્ય',
    },
    'role_deo': {
      AppLocale.en: 'District Officer View',
      AppLocale.hi: 'जिला अधिकारी दृश्य',
      AppLocale.gu: 'જિલ્લા અધિકારી દૃશ્ય',
    },
    'role_contractor': {
      AppLocale.en: 'Contractor View',
      AppLocale.hi: 'ठेकेदार दृश्य',
      AppLocale.gu: 'કોન્ટ્રેક્ટર દૃશ્ય',
    },

    // ── AppShell ─────────────────────────────────────────────────────────────
    'go_online': {
      AppLocale.en: 'Go Online',
      AppLocale.hi: 'ऑनलाइन जाएं',
      AppLocale.gu: 'ઓનલાઈન જાઓ',
    },
    'simulate_offline': {
      AppLocale.en: 'Simulate Offline',
      AppLocale.hi: 'ऑफलाइन सिमुलेट करें',
      AppLocale.gu: 'ઓફલાઈન સિમ્યુલેટ કરો',
    },
    'sign_out': {
      AppLocale.en: 'Sign Out',
      AppLocale.hi: 'साइन आउट',
      AppLocale.gu: 'સાઈન આઉટ',
    },
    'notifications': {
      AppLocale.en: 'Notifications',
      AppLocale.hi: 'सूचनाएं',
      AppLocale.gu: 'સૂચનાઓ',
    },
    'offline_banner': {
      AppLocale.en: 'Offline Mode: Changes will sync automatically.',
      AppLocale.hi: 'ऑफलाइन मोड: परिवर्तन स्वचालित रूप से सिंक होंगे।',
      AppLocale.gu: 'ઓફલાઈન મોડ: ફેરફારો આપોઆપ સિંક થશે.',
    },

    // ── Login ────────────────────────────────────────────────────────────────
    'welcome_back': {
      AppLocale.en: 'Welcome Back.',
      AppLocale.hi: 'वापस स्वागत है।',
      AppLocale.gu: 'પાછા આવ્યા.',
    },
    'login_subtitle': {
      AppLocale.en: 'Enter your credentials to access the infrastructure portal.',
      AppLocale.hi: 'बुनियादी ढांचे पोर्टल तक पहुँचने के लिए अपनी जानकारी दर्ज करें।',
      AppLocale.gu: 'ઈન્ફ્રાસ્ટ્રક્ચર પોર્ટલ ઍક્સેસ કરવા ઓળખપત્ર દાખલ કરો.',
    },
    'identity_email': {
      AppLocale.en: 'IDENTITY / EMAIL',
      AppLocale.hi: 'पहचान / ईमेल',
      AppLocale.gu: 'ઓળખ / ઈ-મેઇલ',
    },
    'email_hint': {
      AppLocale.en: 'name@organization.gov',
      AppLocale.hi: 'name@organization.gov',
      AppLocale.gu: 'name@organization.gov',
    },
    'secret_password': {
      AppLocale.en: 'SECRET / PASSWORD',
      AppLocale.hi: 'गोपनीय / पासवर्ड',
      AppLocale.gu: 'ગુપ્ત / પાસવર્ડ',
    },
    'required': {
      AppLocale.en: 'Required',
      AppLocale.hi: 'आवश्यक',
      AppLocale.gu: 'જરૂરી',
    },
    'sign_in': {
      AppLocale.en: 'Sign In',
      AppLocale.hi: 'साइन इन',
      AppLocale.gu: 'સાઈન ઈન',
    },
    'network_error': {
      AppLocale.en: 'Network error. Check connection or ngrok url.',
      AppLocale.hi: 'नेटवर्क त्रुटि। कनेक्शन या ngrok URL जांचें।',
      AppLocale.gu: 'નેટવર્ક ભૂલ. કનેક્શન અથવા ngrok URL તપાસો.',
    },
    'login_failed': {
      AppLocale.en: 'Login failed',
      AppLocale.hi: 'लॉगिन विफल',
      AppLocale.gu: 'લૉગિન નિષ્ફળ',
    },

    // ── Peon Dashboard ───────────────────────────────────────────────────────
    'good_morning': {
      AppLocale.en: 'Good morning, Rakesh',
      AppLocale.hi: 'सुप्रभात, राकेश',
      AppLocale.gu: 'સુપ્રભાત, રાકેશ',
    },
    'assigned_school': {
      AppLocale.en: 'Assigned School: Government Senior Secondary School - Sector 14',
      AppLocale.hi: 'नियत विद्यालय: सरकारी उच्चतर माध्यमिक विद्यालय - सेक्टर 14',
      AppLocale.gu: 'ફાળવેલ શાળા: સરકારી ઉચ્ચ માધ્યમિક શાળા - સેક્ટર 14',
    },
    'weekly_infra_scan': {
      AppLocale.en: 'Weekly Infrastructure Scan',
      AppLocale.hi: 'साप्ताहिक इन्फ्रास्ट्रक्चर स्कैन',
      AppLocale.gu: 'સાપ્તાહિક ઈન્ફ્રાસ્ટ્રક્ચર સ્કેન',
    },
    'due_in_2_days': {
      AppLocale.en: 'Due in 2 Days',
      AppLocale.hi: '2 दिनों में देय',
      AppLocale.gu: '2 દિવસમાં બાકી',
    },
    'start_weekly_report': {
      AppLocale.en: 'Start Weekly Report',
      AppLocale.hi: 'साप्ताहिक रिपोर्ट शुरू करें',
      AppLocale.gu: 'સાપ્તાહિક રિપોર્ટ શરૂ કરો',
    },
    'recent_submissions': {
      AppLocale.en: 'Recent Submissions',
      AppLocale.hi: 'हाल की प्रविष्टियां',
      AppLocale.gu: 'તાજેતરની સબમિશન',
    },

    // ── Weekly Condition Form ────────────────────────────────────────────────
    'weekly_form_title': {
      AppLocale.en: 'Weekly Condition Form',
      AppLocale.hi: 'साप्ताहिक स्थिति प्रपत्र',
      AppLocale.gu: 'સાપ્તાહિક સ્થિતિ ફોર્મ',
    },
    'plumbing': {
      AppLocale.en: 'Plumbing',
      AppLocale.hi: 'प्लंबिंग',
      AppLocale.gu: 'પ્લમ્બિંગ',
    },
    'electrical': {
      AppLocale.en: 'Electrical',
      AppLocale.hi: 'विद्युत',
      AppLocale.gu: 'વીજળી',
    },
    'structural': {
      AppLocale.en: 'Structural',
      AppLocale.hi: 'संरचनात्मक',
      AppLocale.gu: 'માળખાકીય',
    },
    'toilet_pipelines': {
      AppLocale.en: 'Toilet Pipelines',
      AppLocale.hi: 'शौचालय पाइपलाइन',
      AppLocale.gu: 'શૌચાલય પાઈપલાઈન',
    },
    'wash_basin_drainage': {
      AppLocale.en: 'Wash Basin Drainage',
      AppLocale.hi: 'वाश बेसिन ड्रेनेज',
      AppLocale.gu: 'વૉશ બેઝિન ડ્રેનેજ',
    },
    'classroom_lights': {
      AppLocale.en: 'Classroom Lights',
      AppLocale.hi: 'कक्षा की रोशनी',
      AppLocale.gu: 'ક્લાસરૂમ લાઈટ',
    },
    'main_distribution_panel': {
      AppLocale.en: 'Main Distribution Panel',
      AppLocale.hi: 'मुख्य वितरण पैनल',
      AppLocale.gu: 'મુખ્ય વિતરણ પેનલ',
    },
    'classroom_walls': {
      AppLocale.en: 'Classroom Walls',
      AppLocale.hi: 'कक्षा की दीवारें',
      AppLocale.gu: 'ક્લાસરૂમ દીવાલ',
    },
    'staircase_railings': {
      AppLocale.en: 'Staircase Railings',
      AppLocale.hi: 'सीढ़ी की रेलिंग',
      AppLocale.gu: 'સીડીની રેલિંગ',
    },
    'condition': {
      AppLocale.en: 'Condition',
      AppLocale.hi: 'स्थिति',
      AppLocale.gu: 'સ્થિતિ',
    },
    'excellent': {
      AppLocale.en: 'Excellent',
      AppLocale.hi: 'उत्कृष्ट',
      AppLocale.gu: 'ઉત્તમ',
    },
    'minor_wear': {
      AppLocale.en: 'Minor Wear',
      AppLocale.hi: 'मामूली घिसाव',
      AppLocale.gu: 'સામાન્ય ઘસારો',
    },
    'visible_damage': {
      AppLocale.en: 'Visible Damage',
      AppLocale.hi: 'दृश्यमान क्षति',
      AppLocale.gu: 'દૃશ્ય નુકસાન',
    },
    'critical': {
      AppLocale.en: 'Critical',
      AppLocale.hi: 'गंभीर',
      AppLocale.gu: 'ગંભીર',
    },
    'add_photo': {
      AppLocale.en: 'Add Photo',
      AppLocale.hi: 'फोटो जोड़ें',
      AppLocale.gu: 'ફોટો ઉમેરો',
    },
    'retake_photo': {
      AppLocale.en: 'Retake Photo',
      AppLocale.hi: 'फोटो फिर से लें',
      AppLocale.gu: 'ફોટો ફરી લો',
    },
    'photo_attached': {
      AppLocale.en: 'Photo attached!',
      AppLocale.hi: 'फोटो संलग्न!',
      AppLocale.gu: 'ફોટો જોડ્યો!',
    },
    'peon_photo_need_mobile': {
      AppLocale.en:
          'Verified photos are supported only on the Android or iOS app.',
      AppLocale.hi:
          'सत्यापित फोटो केवल Android या iOS ऐप पर समर्थित हैं।',
      AppLocale.gu:
          'ચકાસાયેલ ફોટા માત્ર Android અથવા iOS ઍપ પર સમર્થિત છે.',
    },
    'peon_photo_location_services_off': {
      AppLocale.en: 'Turn on location services to verify inspection photos.',
      AppLocale.hi: 'निरीक्षण फोटो सत्यापित करने के लिए लोकेशन सेवाएं चालू करें।',
      AppLocale.gu: 'નિરીક્ષણ ફોટા ચકાસવા માટે લોકેશન સેવાઓ ચાલુ કરો.',
    },
    'peon_photo_location_permission': {
      AppLocale.en:
          'Location permission is required so photo GPS can be matched to your position.',
      AppLocale.hi:
          'फोटो GPS को आपकी स्थिति से मिलाने के लिए लोकेशन अनुमति आवश्यक है।',
      AppLocale.gu:
          'ફોટો GPSને તમારી સ્થિતિ સાથે મેળવવા લોકેશન પરવાનગી જરૂરી છે.',
    },
    'peon_photo_location_unavailable': {
      AppLocale.en: 'Could not read your current location. Try again outdoors.',
      AppLocale.hi: 'आपकी वर्तमान स्थिति नहीं मिली। बाहर फिर से प्रयास करें।',
      AppLocale.gu: 'તમારું વર્તમાન સ્થાન મળ્યું નથી. બહાર ફરી પ્રયાસ કરો.',
    },
    'peon_photo_no_gps_embedded': {
      AppLocale.en:
          'This photo has no location tag. Enable Save location in the camera app, then retake.',
      AppLocale.hi:
          'इस फोटो में स्थान टैग नहीं है। कैमरा ऐप में स्थान सहेजें चालू करें और फिर से लें।',
      AppLocale.gu:
          'આ ફોટામાં સ્થાન ટેગ નથી. કેમેરા ઍપમાં સ્થાન સાચવો ચાલુ કરી ફરી લો.',
    },
    'peon_photo_site_mismatch': {
      AppLocale.en:
          'Photo location does not match your current position. Take the picture at the school site.',
      AppLocale.hi:
          'फोटो का स्थान आपकी वर्तमान स्थिति से मेल नहीं खाता। विद्यालय परिसर में फोटो लें।',
      AppLocale.gu:
          'ફોટાનું સ્થાન તમારી વર્તમાન સ્થિતિ સાથે મેળ ખાતું નથી. શાળા પરિસરમાં ફોટો લો.',
    },
    'peon_photo_not_fresh': {
      AppLocale.en:
          'Photo is too old or its time stamp is missing. Capture a new picture now.',
      AppLocale.hi:
          'फोटो बहुत पुराना है या समय अंकित नहीं है। अभी नया फोटो लें।',
      AppLocale.gu:
          'ફોટો ખૂબ જૂનો છે અથવા સમય ચિહ્ન નથી. હમણાં નવો ફોટો લો.',
    },
    'peon_photo_exif_read_failed': {
      AppLocale.en: 'Could not read photo metadata. Try another shot.',
      AppLocale.hi: 'फोटो मेटाडेटा नहीं पढ़ा जा सका। दोबारा प्रयास करें।',
      AppLocale.gu: 'ફોટો મેટાડેટા વાંચી શકાયો નહીં. ફરી પ્રયાસ કરો.',
    },
    'peon_photo_each_category': {
      AppLocale.en:
          'Add a verified camera photo for every category (Plumbing, Electrical, Structural).',
      AppLocale.hi:
          'प्रत्येक श्रेणी के लिए सत्यापित कैमरा फोटो जोड़ें (प्लंबिंग, विद्युत, संरचना)।',
      AppLocale.gu:
          'દરેક શ્રેણી માટે ચકાસાયેલ કેમેરા ફોટો ઉમેરો (પ્લમ્બિંગ, વીજળી, માળખું).',
    },
    'next_category': {
      AppLocale.en: 'Next Category',
      AppLocale.hi: 'अगली श्रेणी',
      AppLocale.gu: 'આગળની શ્રેણી',
    },
    'submit_report': {
      AppLocale.en: 'Submit Report',
      AppLocale.hi: 'रिपोर्ट जमा करें',
      AppLocale.gu: 'રિપોર્ટ સબમિટ કરો',
    },
    'report_submitted': {
      AppLocale.en: 'Report submitted successfully.',
      AppLocale.hi: 'रिपोर्ट सफलतापूर्वक जमा की गई।',
      AppLocale.gu: 'રિપોર્ટ સફળતાપૂર્વક સબમિટ થઈ.',
    },

    // ── Principal Dashboard ──────────────────────────────────────────────────
    'principal_school': {
      AppLocale.en: 'Government Senior Secondary School - Sector 14',
      AppLocale.hi: 'सरकारी उच्चतर माध्यमिक विद्यालय - सेक्टर 14',
      AppLocale.gu: 'સરકારી ઉચ્ચ માધ્યમિક શાળા - સેક્ટર 14',
    },
    'predictive_timeline': {
      AppLocale.en: 'Predictive Horizon Timeline',
      AppLocale.hi: 'भविष्यसूचक क्षितिज कालरेखा',
      AppLocale.gu: 'ભવિષ્ય ક્ષિતિજ સમયરેખા',
    },
    'next_30_days': {
      AppLocale.en: 'Next 30 Days',
      AppLocale.hi: 'अगले 30 दिन',
      AppLocale.gu: 'આગળ 30 દિવસ',
    },
    'next_60_days': {
      AppLocale.en: 'Next 60 Days',
      AppLocale.hi: 'अगले 60 दिन',
      AppLocale.gu: 'આગળ 60 દિવસ',
    },
    'urgent_attention': {
      AppLocale.en: 'Urgent Attention Required',
      AppLocale.hi: 'तत्काल ध्यान आवश्यक',
      AppLocale.gu: 'તાત્કાલિક ધ્યાન જરૂરી',
    },
    'high_impact_toilet': {
      AppLocale.en: "HIGH IMPACT: Girls' Toilet",
      AppLocale.hi: 'उच्च प्रभाव: बालिका शौचालय',
      AppLocale.gu: 'ઉચ્ચ અસર: છોકરીઓનો શૌચાલય',
    },
    'plumbing_failure': {
      AppLocale.en: 'Plumbing Failure Predicted',
      AppLocale.hi: 'प्लंबिंग विफलता की भविष्यवाणी',
      AppLocale.gu: 'પ્લમ્બિંગ નિષ્ફળ થવાની ધારણા',
    },
    'high_impact_lab': {
      AppLocale.en: 'HIGH IMPACT: Lab Wiring',
      AppLocale.hi: 'उच्च प्रभाव: लैब वायरिंग',
      AppLocale.gu: 'ઉચ્ચ અસર: લેબ વાયરિંગ',
    },
    'electrical_overload': {
      AppLocale.en: 'Electrical Overload Risk',
      AppLocale.hi: 'विद्युत अधिभार जोखिम',
      AppLocale.gu: 'વિદ્યુત ઓવરલોડ જોખમ',
    },
    'review_approve': {
      AppLocale.en: 'Review & Approve',
      AppLocale.hi: 'समीक्षा और अनुमोदन',
      AppLocale.gu: 'સમીક્ષા અને મંજૂરી',
    },
    'dismiss': {
      AppLocale.en: 'Dismiss',
      AppLocale.hi: 'खारिज करें',
      AppLocale.gu: 'રદ કરો',
    },
    'structural_45': {
      AppLocale.en: 'Structural - 45 Days',
      AppLocale.hi: 'संरचनात्मक - 45 दिन',
      AppLocale.gu: 'માળખાકીય - 45 દિવસ',
    },
    'trigger_evidence': {
      AppLocale.en: 'Trigger Evidence',
      AppLocale.hi: 'ट्रिगर साक्ष्य',
      AppLocale.gu: 'ટ્રિગર પૂરાવો',
    },
    'evidence_cracks': {
      AppLocale.en: '• 3 consecutive weeks of "Minor Cracks" reported.',
      AppLocale.hi: '• लगातार 3 सप्ताह "मामूली दरारें" रिपोर्ट की गईं।',
      AppLocale.gu: '• સળંગ 3 અઠવાડિયા "નાની તિરાડ" નોંધવામાં આવી.',
    },
    'evidence_age': {
      AppLocale.en: '• Building age: 42 years.',
      AppLocale.hi: '• भवन आयु: 42 वर्ष।',
      AppLocale.gu: '• ઈમારતની ઉંમર: 42 વર્ષ.',
    },
    'evidence_rainfall': {
      AppLocale.en: '• Recent heavy rainfall in district zone.',
      AppLocale.hi: '• जिला क्षेत्र में हाल की भारी वर्षा।',
      AppLocale.gu: '• જિલ્લા વિસ્તારમાં તાજેતરની ભારે વરસાદ.',
    },
    'request_deo': {
      AppLocale.en: 'Request Immediate DEO Intervention',
      AppLocale.hi: 'तत्काल DEO हस्तक्षेप का अनुरोध करें',
      AppLocale.gu: 'તાત્કાલિક DEO દખલ માટે વિનંતી',
    },
    'predicted_failure': {
      AppLocale.en: 'Predicted Failure:',
      AppLocale.hi: 'पूर्वानुमानित विफलता:',
      AppLocale.gu: 'અંદાજિત નિષ્ફળ:',
    },

    // ── DEO Dashboard ────────────────────────────────────────────────────────
    'north_district': {
      AppLocale.en: 'North District - 12 Critical Alerts',
      AppLocale.hi: 'उत्तर जिला - 12 गंभीर अलर्ट',
      AppLocale.gu: 'ઉત્તર જિલ્લો - 12 ગંભીર ચેતવણી',
    },
    'sort_by': {
      AppLocale.en: 'Sort by',
      AppLocale.hi: 'क्रमबद्ध करें',
      AppLocale.gu: 'ક્રમ ગોઠવો',
    },
    'filter_by': {
      AppLocale.en: 'Filter by',
      AppLocale.hi: 'फ़िल्टर करें',
      AppLocale.gu: 'ફિલ્ટર કરો',
    },
    'impact_level': {
      AppLocale.en: 'Impact Level',
      AppLocale.hi: 'प्रभाव स्तर',
      AppLocale.gu: 'અસર સ્તર',
    },
    'time_to_failure': {
      AppLocale.en: 'Time-to-Failure',
      AppLocale.hi: 'विफलता-समय',
      AppLocale.gu: 'નિષ્ફળ-સમય',
    },
    'all': {
      AppLocale.en: 'All',
      AppLocale.hi: 'सभी',
      AppLocale.gu: 'બધા',
    },
    'view_ai_evidence': {
      AppLocale.en: 'View AI Evidence',
      AppLocale.hi: 'AI साक्ष्य देखें',
      AppLocale.gu: 'AI પૂરાવો જુઓ',
    },
    'assign_contractor': {
      AppLocale.en: 'Assign Contractor',
      AppLocale.hi: 'ठेकेदार नियुक्त करें',
      AppLocale.gu: 'કોન્ટ્રેક્ટર સોંપો',
    },
    'assign_work_order': {
      AppLocale.en: 'Assign Work Order',
      AppLocale.hi: 'कार्य आदेश सौंपें',
      AppLocale.gu: 'કામ સોંપો',
    },
    'active_workload': {
      AppLocale.en: 'Active workload:',
      AppLocale.hi: 'सक्रिय कार्यभार:',
      AppLocale.gu: 'સક્રિય કાર્ય:',
    },
    'deo_school_1': {
      AppLocale.en: 'GGSSS Sector 14',
      AppLocale.hi: 'जीजीएसएसएस सेक्टर 14',
      AppLocale.gu: 'GGSSS સેક્ટર 14',
    },
    'deo_school_2': {
      AppLocale.en: 'Model School Sector 21',
      AppLocale.hi: 'मॉडल स्कूल सेक्टर 21',
      AppLocale.gu: 'મૉડલ સ્કૂલ સેક્ટર 21',
    },
    'deo_desc_1': {
      AppLocale.en: "Girls' Toilet leakage escalating.",
      AppLocale.hi: 'बालिका शौचालय में रिसाव बढ़ रहा है।',
      AppLocale.gu: 'છોકરીઓના શૌચાલયમાં લિકેજ વધી રહ્યું છે.',
    },
    'deo_desc_2': {
      AppLocale.en: 'Lab wiring degradation pattern detected.',
      AppLocale.hi: 'लैब वायरिंग क्षरण पैटर्न का पता चला।',
      AppLocale.gu: 'લેબ વાયરિંગ ઘટાડો પેટર્ન જોવા મળ્યો.',
    },
    'high_impact': {
      AppLocale.en: 'HIGH IMPACT',
      AppLocale.hi: 'उच्च प्रभाव',
      AppLocale.gu: 'ઉચ્ચ અસર',
    },
    'medium_impact': {
      AppLocale.en: 'MEDIUM IMPACT',
      AppLocale.hi: 'मध्यम प्रभाव',
      AppLocale.gu: 'મધ્યમ અસર',
    },
    'days': {
      AppLocale.en: 'Days',
      AppLocale.hi: 'दिन',
      AppLocale.gu: 'દિવસ',
    },
    'ai_evidence_1': {
      AppLocale.en: '• Repeated issue severity trend in last 3 reports.',
      AppLocale.hi: '• पिछले 3 रिपोर्टों में बार-बार समस्या की गंभीरता।',
      AppLocale.gu: '• છેલ્લા 3 રિપોર્ટ્સમાં વારંવાર સમસ્યા.',
    },
    'ai_evidence_2': {
      AppLocale.en: '• Historical asset age and climate load increase.',
      AppLocale.hi: '• ऐतिहासिक संपत्ति आयु और जलवायु भार वृद्धि।',
      AppLocale.gu: '• ઐતિહાસિક સંપત્તિ ઉંમર અને આબોહવા ભાર.',
    },
    'fcm_msg': {
      AppLocale.en: 'FCM notification sent.',
      AppLocale.hi: 'FCM सूचना भेजी गई।',
      AppLocale.gu: 'FCM સૂચના મોકલી.',
    },

    // ── Contractor Inbox ─────────────────────────────────────────────────────
    'new_order': {
      AppLocale.en: 'New',
      AppLocale.hi: 'नया',
      AppLocale.gu: 'નવું',
    },
    'active_order': {
      AppLocale.en: 'Active',
      AppLocale.hi: 'सक्रिय',
      AppLocale.gu: 'સક્રિય',
    },
    'completed_order': {
      AppLocale.en: 'Completed',
      AppLocale.hi: 'पूर्ण',
      AppLocale.gu: 'સંપૂર્ણ',
    },
    'navigate': {
      AppLocale.en: 'Navigate',
      AppLocale.hi: 'नेविगेट करें',
      AppLocale.gu: 'નેવિગેટ',
    },
    'accept': {
      AppLocale.en: 'Accept',
      AppLocale.hi: 'स्वीकार करें',
      AppLocale.gu: 'સ્વીકારો',
    },
    'start_work': {
      AppLocale.en: 'Start Work',
      AppLocale.hi: 'काम शुरू करें',
      AppLocale.gu: 'કામ શરૂ કરો',
    },
    'contractor_school_1': {
      AppLocale.en: 'GGSSS Sector 14',
      AppLocale.hi: 'जीजीएसएसएस सेक्टर 14',
      AppLocale.gu: 'GGSSS સેક્ટર 14',
    },
    'contractor_school_2': {
      AppLocale.en: 'Model School Sector 21',
      AppLocale.hi: 'मॉडल स्कूल सेक्टर 21',
      AppLocale.gu: 'મૉડલ સ્કૂલ સેક્ટર 21',
    },
    'contractor_school_3': {
      AppLocale.en: 'Govt Middle School Sector 8',
      AppLocale.hi: 'सरकारी मिडिल स्कूल सेक्टर 8',
      AppLocale.gu: 'સરકારી મિડલ સ્કૂલ સેક્ટર 8',
    },
    'due_3_days': {
      AppLocale.en: 'Due in 3 days',
      AppLocale.hi: '3 दिनों में देय',
      AppLocale.gu: '3 દિવસમાં બાકી',
    },
    'due_5_days': {
      AppLocale.en: 'Due in 5 days',
      AppLocale.hi: '5 दिनों में देय',
      AppLocale.gu: '5 દિવસમાં બાકી',
    },
    'sla_completed': {
      AppLocale.en: 'Completed',
      AppLocale.hi: 'पूर्ण',
      AppLocale.gu: 'સંપૂર્ણ',
    },

    // ── Completion / ML Feedback ─────────────────────────────────────────────
    'completion_title': {
      AppLocale.en: 'Completion & ML Feedback',
      AppLocale.hi: 'समापन और ML फीडबैक',
      AppLocale.gu: 'સમાપ્તિ અને ML પ્રતિભાવ',
    },
    'evidence_upload': {
      AppLocale.en: 'Evidence Upload',
      AppLocale.hi: 'साक्ष्य अपलोड',
      AppLocale.gu: 'પૂરાવો અપલોડ',
    },
    'before_photo': {
      AppLocale.en: 'Before Photo',
      AppLocale.hi: 'पहले की फोटो',
      AppLocale.gu: 'પહેલાંની ફોટો',
    },
    'after_photo': {
      AppLocale.en: 'After Photo',
      AppLocale.hi: 'बाद की फोटो',
      AppLocale.gu: 'પછીની ફોટો',
    },
    'repair_feedback': {
      AppLocale.en: 'Repair Feedback Loop',
      AppLocale.hi: 'मरम्मत फीडबैक लूप',
      AppLocale.gu: 'સમારકામ પ્રતિભાવ',
    },
    'prediction_question': {
      AppLocale.en: 'Help improve our system. Was the issue exactly as predicted?',
      AppLocale.hi: 'हमारी प्रणाली सुधारें। क्या समस्या बिल्कुल पूर्वानुमानित थी?',
      AppLocale.gu: 'અમારી સિસ્ટમ સુધારો. સમસ્યા અંદાજ પ્રમાણે હતી?',
    },
    'yes': {
      AppLocale.en: 'Yes',
      AppLocale.hi: 'हाँ',
      AppLocale.gu: 'હા',
    },
    'partially': {
      AppLocale.en: 'Partially',
      AppLocale.hi: 'आंशिक रूप से',
      AppLocale.gu: 'આંશિક',
    },
    'no': {
      AppLocale.en: 'No',
      AppLocale.hi: 'नहीं',
      AppLocale.gu: 'ના',
    },
    'actual_issue': {
      AppLocale.en: 'What was the actual issue?',
      AppLocale.hi: 'वास्तविक समस्या क्या थी?',
      AppLocale.gu: 'વાસ્તવિક સમસ્યા શું હતી?',
    },
    'pipe_burst': {
      AppLocale.en: 'Pipe burst',
      AppLocale.hi: 'पाइप फटना',
      AppLocale.gu: 'પાઈપ ફૂટ',
    },
    'water_pump_failure': {
      AppLocale.en: 'Water pump failure',
      AppLocale.hi: 'जल पंप विफलता',
      AppLocale.gu: 'પાણી પંપ ખામી',
    },
    'circuit_short': {
      AppLocale.en: 'Circuit short',
      AppLocale.hi: 'सर्किट शॉर्ट',
      AppLocale.gu: 'સર્કિટ શોર્ટ',
    },
    'structural_erosion': {
      AppLocale.en: 'Structural erosion',
      AppLocale.hi: 'संरचनात्मक क्षरण',
      AppLocale.gu: 'માળખાકીય ધોવાણ',
    },
    'submit_close': {
      AppLocale.en: 'Submit & Close Work Order',
      AppLocale.hi: 'जमा करें और कार्य आदेश बंद करें',
      AppLocale.gu: 'સબમિટ કરો અને કામ બંધ કરો',
    },
    'work_order_closed': {
      AppLocale.en: 'Work order submitted and closed.',
      AppLocale.hi: 'कार्य आदेश जमा और बंद किया गया।',
      AppLocale.gu: 'કામ સબમિટ અને બંધ.',
    },
  };
}
