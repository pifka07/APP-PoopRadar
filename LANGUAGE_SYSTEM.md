# 🌍 Multi-Language Translation System

## Supported Languages

The PoopRadar app now supports **8 languages**:

| Code | Language | Flag | Country |
|------|----------|------|---------|
| **de** | Deutsch | 🇩🇪 | German-speaking regions |
| **en** | English | 🇬🇧 | United Kingdom & English-speaking |
| **fr** | Français | 🇫🇷 | France & French-speaking |
| **es** | Español | 🇪🇸 | Spain & Spanish-speaking |
| **it** | Italiano | 🇮🇹 | Italy & Italian-speaking |
| **pl** | Polski | 🇵🇱 | Poland & Polish-speaking |
| **lv** | Latviešu | 🇱🇻 | Latvia & Latvian-speaking |
| **lt** | Lietuvių | 🇱🇹 | Lithuania & Lithuanian-speaking |

## Implementation Details

### 1. **Translation Files**

#### App.js (Embedded Translations)
- Location: `App.js` (lines 52-270)
- Contains: Full `translations` object with all 8 languages
- Structure: Object with language codes as keys

```javascript
const translations = {
  de: { profile: 'Profil', ... },
  en: { profile: 'Profile', ... },
  // ... etc
};
```

#### translations.json (Reference)
- Location: `translations.json`
- Purpose: Standalone JSON file for reference and potential API usage
- Identical content to the embedded translations in App.js

### 2. **Language Switcher**

**Location in UI**: Profile tab → Language section

**Features**:
- Shows current language with flag emoji
- Opens a modal picker with all 8 languages
- Displays checkmark (✓) next to active language
- Smooth transition with language data persistence

**UI Component Code**:
```javascript
<TouchableOpacity 
  style={styles.pickerTrigger} 
  onPress={() => setShowLanguagePicker(true)}
>
  <Text style={{fontSize: 18}}>
    {SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag}
  </Text>
  <Text style={{color: '#999'}}>▼</Text>
</TouchableOpacity>
```

### 3. **State Management**

- **Language State**: `const [language, setLanguage] = useState('de');`
- **Language Picker State**: `const [showLanguagePicker, setShowLanguagePicker] = useState(false);`
- **Storage Key**: `LANGUAGE_STORAGE_KEY = 'app.language'`

### 4. **Language Change Function**

```javascript
const changeLanguage = async (nextLanguage) => {
  setLanguage(nextLanguage);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
};
```

**Features**:
- Updates app language immediately
- Persists selection to device storage
- Loads on app startup

### 5. **Language Modal Picker**

**Location**: Line 2103-2120 in App.js

**Features**:
- Slide-up animation
- Semi-transparent overlay
- Scrollable list of all languages
- Active language highlighted with background color
- Checkmark indicator for current language

```javascript
<Modal visible={showLanguagePicker} animationType="slide" transparent>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>{t.selectLanguage}</Text>
      <ScrollView>
        {SUPPORTED_LANGUAGES.map(lang => (
          <TouchableOpacity 
            key={lang.code} 
            style={[styles.pickerItem, language === lang.code && styles.pickerItemActive]}
            onPress={() => {
              changeLanguage(lang.code);
              setShowLanguagePicker(false);
            }}
          >
            <Text style={{fontSize: 20, marginRight: 15}}>{lang.flag}</Text>
            <Text style={{fontSize: 16, fontWeight: '500'}}>{lang.label}</Text>
            {language === lang.code && <Text style={{marginLeft: 'auto', fontSize: 18}}>✓</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity onPress={() => setShowLanguagePicker(false)} style={styles.modalCloseBtn}>
        <Text style={styles.modalCloseBtnText}>{t.cancel}</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

## Adding New Translations

### Step 1: Add Translation Object
In `App.js`, add a new language to the `translations` object:

```javascript
const translations = {
  // ... existing languages
  xx: {  // Replace 'xx' with language code
    profile: '...',
    radar: '...',
    // Add all required keys
  }
};
```

### Step 2: Add to SUPPORTED_LANGUAGES
```javascript
const SUPPORTED_LANGUAGES = [
  // ... existing languages
  { code: 'xx', label: 'Language Name', flag: '🏳️' },
];
```

### Step 3: Update translations.json
Add the new language object to `translations.json` for reference.

## Translation Keys Reference

All 56 translation keys used throughout the app:

```
General: profile, radar, cities, reports, points, pro, guest, language, loading
Navigation: profileTitle, cityRanking, topReporters, top30Cities, top20Reporters
Reports: reportType, submitReport, reportPoop, reportBags, reportBagsShort, reportPoison, 
         reportIllegalWaste, reportIllegalWasteShort, saved, reportSaved, saveFailed, 
         entryNotSaved
Authentication: login, createAccount, loginRegister, deleteAccount, password, passwordHint
User Profile: name, nickname, currentRank, leaderboardProfile, allowPublishing, defaultCountry
Notifications: notifications, notificationsOn, notificationsOff, notificationsUnknown, openSettings
Feedback: reportFeedback, vibration, vibrationHint, sound, soundHint
System: cancel, close, save, badges, privacy, logout, pointSystem, cleanTitle, earnedXp
Location: foundIn, type, locationWaiting, signInRequired, signInForXp
Messages: accountDeleted, accountDeletedMessage, settingsNotSaved, leaderboardNote, noReporters
Pickers: selectLanguage, selectCountry, global, country, myCity, filterByCountry
```

## Testing the Language System

1. **Open Profile Tab**
   - Navigate to Profile section
   - Locate Language section

2. **Change Language**
   - Tap the flag icon with dropdown arrow
   - Select desired language from modal
   - App updates immediately

3. **Verify Persistence**
   - Close and reopen app
   - Language preference should persist

4. **Check All Languages**
   - Repeat test for each of 8 supported languages
   - Verify all UI text updates correctly

## Future Improvements

- [ ] Language selection on first app launch
- [ ] Auto-detect device language
- [ ] RTL support for future languages
- [ ] Translation management backend API
- [ ] Community translation contributions
- [ ] In-app language learning module

## Notes

- All translations are stored client-side (no API calls)
- Language selection is persisted using AsyncStorage
- Default language: German (de)
- Fallback to English if translation key missing
