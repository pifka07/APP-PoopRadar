import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Image, ActivityIndicator, FlatList, TextInput, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { createClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';

// --- SUPABASE SETUP ---
const supabaseUrl = 'https://jpzkqatezxnbawcsvgux.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwemtxYXRlenhuYmF3Y3N2Z3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQ3MTMsImV4cCI6MjA4ODgzMDcxM30._w0GheLM-aTWGdA6hsozokTAgdUOUlwsqEflgCC-xiU'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  // Auth States
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAuth, setShowAuth] = useState(false);

  // App States
  const [location, setLocation] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedSize, setSelectedSize] = useState('M');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('Radar');
  const [xp, setXp] = useState(0);
  const [selectedPoop, setSelectedPoop] = useState(null);

  useEffect(() => {
    // Session beim Start prüfen
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Auf Auth-Änderungen hören (Login/Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    setupApp();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const setupApp = async () => {
    let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus !== 'granted') {
      Alert.alert('Fehler', 'GPS Rechte werden benötigt, um Haufen in deiner Nähe zu sehen.');
    }
    let loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
    await fetchMarkers();
    setTimeout(() => setIsLoading(false), 1000);
  };

  const fetchMarkers = async () => {
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (!error) setMarkers(data || []);
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Unbekannt";
    const diff = new Date() - new Date(timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Gerade eben";
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    return `vor ${Math.floor(hours / 24)} Tagen`;
  };

  // --- ROBUSTE AUTH LOGIK ---
  const handleAuth = async (type) => {
    if (!email || !password) {
      Alert.alert("Eingabe fehlt", "Bitte E-Mail und Passwort eingeben.");
      return;
    }
    
    setIsLoading(true);
    try {
      if (type === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert("Willkommen!", "Dein Account wurde erstellt.");
      }
      setShowAuth(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      Alert.alert("Auth Fehler", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const requireAuth = (action) => {
    if (!session) {
      setShowAuth(true);
    } else {
      action();
    }
  };

  const reportPoop = async (useCamera) => {
    if (!location) return;
    let photoUrl = null;

    if (useCamera) {
      let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.2, base64: true });
      if (result.canceled) return;
      setIsUploading(true);
      const fileName = `poop_${Date.now()}.jpg`;
      await supabase.storage.from('poop-photos').upload(`public/${fileName}`, decode(result.assets[0].base64), { contentType: 'image/jpeg' });
      const { data } = supabase.storage.from('poop-photos').getPublicUrl(`public/${fileName}`);
      photoUrl = data.publicUrl;
    }

    const rev = await Location.reverseGeocodeAsync(location);
    const city = rev[0]?.city || "Unbekannt";

    const { error } = await supabase.from('reports').insert([
      { latitude: location.latitude, longitude: location.longitude, size: selectedSize, city, image_url: photoUrl }
    ]);

    if (!error) {
      setXp(prev => prev + (useCamera ? 100 : 20));
      fetchMarkers();
      setIsUploading(false);
      Alert.alert("🚨 Gemeldet!", "Haufen wurde auf der Karte markiert.");
    }
  };

  const deletePoop = async (id) => {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (!error) {
      setXp(prev => prev + 50);
      setSelectedPoop(null);
      fetchMarkers();
      Alert.alert("Sauber!", "Danke fürs Wegräumen! +50 XP");
    }
  };

  if (isLoading || isUploading) return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#8B4513" />
      <Text style={{marginTop: 10}}>{isUploading ? "Foto wird hochgeladen..." : "Radar wird kalibriert..."}</Text>
    </View>
  );

  // --- AUTH SCREEN ---
  if (showAuth) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authEmoji}>💩</Text>
        <Text style={styles.authTitle}>Mitmachen & Punkte sammeln</Text>
        <Text style={styles.authSub}>Melde dich an, um Haufen zu melden oder zu entfernen.</Text>
        
        <TextInput style={styles.input} placeholder="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Passwort" value={password} onChangeText={setPassword} secureTextEntry />
        
        <TouchableOpacity style={styles.authBtn} onPress={() => handleAuth('login')}>
          <Text style={styles.authBtnText}>LOGIN</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.authBtn, {backgroundColor: '#999'}]} onPress={() => handleAuth('signup')}>
          <Text style={styles.authBtnText}>REGISTRIEREN</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setShowAuth(false)} style={{marginTop: 20}}>
          <Text style={{color: '#8B4513', fontWeight: 'bold'}}>Erstmal nur umschauen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
            <Text style={styles.xpTitle}>{session ? "DEIN LEVEL" : "GAST MODUS"}</Text>
            <Text style={styles.xpValue}>{xp} XP</Text>
        </View>
        <TouchableOpacity onPress={() => session ? supabase.auth.signOut() : setShowAuth(true)} style={styles.loginBtn}>
            <Text style={styles.loginBtnText}>{session ? "LOGOUT" : "LOGIN"}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'Radar' ? (
        <View style={{ flex: 1 }}>
          <MapView 
            style={styles.map} 
            initialRegion={{ latitude: location?.latitude || 48.77, longitude: location?.longitude || 9.18, latitudeDelta: 0.01, longitudeDelta: 0.01 }} 
            showsUserLocation
            onPress={() => setSelectedPoop(null)}
          >
            {markers.map(m => (
              <Marker 
                key={m.id} 
                coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                onPress={(e) => { e.stopPropagation(); setSelectedPoop(m); }}
              >
                <View style={styles.markerEmoji}>
                    <Text style={{ fontSize: m.size === 'L' ? 30 : 22 }}>💩</Text>
                </View>
              </Marker>
            ))}
          </MapView>
          
          {/* Infokarte (Statt Popup) */}
          {selectedPoop && (
            <View style={styles.infoCard}>
              <View style={styles.infoContent}>
                <View style={styles.infoTextWrapper}>
                  <Text style={styles.infoTitle}>{selectedPoop.city}</Text>
                  <Text style={styles.timeTag}>🕒 {getTimeAgo(selectedPoop.created_at)}</Text>
                  <Text style={styles.infoSub}>Größe: {selectedPoop.size}</Text>
                  
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => requireAuth(() => deletePoop(selectedPoop.id))}>
                    <Text style={styles.deleteBtnText}>WEGRÄUMEN</Text>
                  </TouchableOpacity>
                </View>
                {selectedPoop.image_url ? (
                  <Image source={{ uri: selectedPoop.image_url }} style={styles.infoImg} />
                ) : (
                  <View style={[styles.infoImg, {backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center'}]}><Text style={{fontSize: 30}}>💩</Text></View>
                )}
              </View>
            </View>
          )}

          {/* Steuerung unten */}
          {!selectedPoop && (
            <View style={styles.overlay}>
                <View style={styles.sizeRow}>
                    {['S', 'M', 'L'].map(s => (
                        <TouchableOpacity key={s} onPress={() => setSelectedSize(s)} style={[styles.sizeBtn, selectedSize === s && styles.sizeBtnActive]}>
                            <Text style={{fontWeight: 'bold', color: selectedSize === s ? 'white' : 'black'}}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.btnRow}>
                    <TouchableOpacity style={[styles.mainBtn, {backgroundColor: '#5D4037'}]} onPress={() => requireAuth(() => reportPoop(false))}>
                        <Text style={styles.btnText}>SCHNELL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.mainBtn, {backgroundColor: '#FF4136'}]} onPress={() => requireAuth(() => reportPoop(true))}>
                        <Text style={styles.btnText}>📸 FOTO</Text>
                    </TouchableOpacity>
                </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.rankContainer}>
          <Text style={styles.rankTitle}>🏆 Stadt-Ranking</Text>
          <FlatList 
            data={Object.entries(markers.reduce((acc, m) => { acc[m.city] = (acc[m.city] || 0) + 1; return acc; }, {})).map(([city, count]) => ({ city, count })).sort((a,b) => b.count - a.count)} 
            keyExtractor={(item) => item.city}
            renderItem={({item}) => (
              <View style={styles.rankRow}>
                <Text style={{fontWeight: 'bold', fontSize: 16}}>{item.city}</Text>
                <Text style={{color: '#8B4513', fontWeight: 'bold'}}>{item.count} 💩</Text>
              </View>
            )} 
          />
        </View>
      )}

      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => setActiveTab('Radar')} style={[styles.navItem, activeTab === 'Radar' && styles.navItemActive]}>
            <Text style={{color: activeTab === 'Radar' ? '#8B4513' : '#999', fontWeight: 'bold'}}>📡 RADAR</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('Ranking')} style={[styles.navItem, activeTab === 'Ranking' && styles.navItemActive]}>
            <Text style={{color: activeTab === 'Ranking' ? '#8B4513' : '#999', fontWeight: 'bold'}}>🏆 RANKING</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 25, paddingBottom: 15, backgroundColor: '#fff' },
  xpTitle: { fontSize: 10, color: '#999', fontWeight: 'bold' },
  xpValue: { fontSize: 20, fontWeight: 'bold', color: '#8B4513' },
  loginBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#8B4513' },
  loginBtnText: { color: '#8B4513', fontWeight: 'bold', fontSize: 12 },
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  markerEmoji: { backgroundColor: 'white', padding: 6, borderRadius: 25, borderWidth: 2, borderColor: '#8B4513', elevation: 4 },
  
  infoCard: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'white', borderRadius: 25, padding: 20, elevation: 15 },
  infoContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoTextWrapper: { flex: 1 },
  infoTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  timeTag: { fontSize: 12, color: '#FF8C00', fontWeight: 'bold', marginVertical: 4 },
  infoSub: { color: '#888', marginBottom: 15, fontSize: 14 },
  infoImg: { width: 100, height: 100, borderRadius: 15, marginLeft: 15 },
  deleteBtn: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 15, alignSelf: 'flex-start' },
  deleteBtnText: { color: 'white', fontWeight: 'bold' },

  overlay: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 30, padding: 20, elevation: 5 },
  sizeRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  sizeBtn: { width: 50, height: 50, backgroundColor: '#f0f0f0', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginHorizontal: 10 },
  sizeBtnActive: { backgroundColor: '#8B4513' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  mainBtn: { flex: 1, height: 55, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  
  navbar: { flexDirection: 'row', height: 80, borderTopWidth: 1, borderColor: '#f0f0f0', backgroundColor: '#fff' },
  navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navItemActive: { borderTopWidth: 3, borderTopColor: '#8B4513' },
  
  rankContainer: { flex: 1, padding: 30 },
  rankTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 25 },
  rankRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#f9f9f9', borderRadius: 20, marginBottom: 10 },

  // Auth Styles
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#fff' },
  authEmoji: { fontSize: 80, marginBottom: 20 },
  authTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  authSub: { textAlign: 'center', color: '#666', marginBottom: 30 },
  input: { width: '100%', height: 55, borderWidth: 1, borderColor: '#ddd', borderRadius: 15, paddingHorizontal: 15, marginBottom: 15, fontSize: 16 },
  authBtn: { width: '100%', height: 55, backgroundColor: '#8B4513', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  authBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});