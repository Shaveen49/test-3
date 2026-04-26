// src/utils/theme.js
import { StyleSheet } from 'react-native';

export const C = {
  primary:        '#2E7D5E',
  primaryLight:   '#4CAF84',
  primaryDark:    '#1B5E42',
  accent:         '#FF7043',
  bg:             '#F4F7F5',
  surface:        '#FFFFFF',
  border:         '#DDE8E2',
  text:           '#192820',
  textSub:        '#5E7568',
  textMuted:      '#9EB3A5',
  error:          '#C62828',
  errorBg:        '#FFEBEE',
  success:        '#2E7D32',
  successBg:      '#E8F5E9',
  warning:        '#E65100',
  warningBg:      '#FFF3E0',
  info:           '#1565C0',
  infoBg:         '#E3F2FD',
  white:          '#FFFFFF',
  black:          '#000000',
  overlay:        'rgba(0,0,0,0.5)',
  // ride status colours
  sRequested:     '#F57C00',
  sAccepted:      '#1976D2',
  sStarted:       '#388E3C',
  sCompleted:     '#757575',
  sCancelled:     '#C62828',
};

export const SP = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:52 };
export const FS = { xs:11, sm:13, md:15, lg:17, xl:20, xxl:24, h1:30 };
export const R  = { sm:8,  md:12, lg:16, xl:24, full:999 };

export const SH = {
  sm: { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.07, shadowRadius:3, elevation:2 },
  md: { shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.11, shadowRadius:6, elevation:4 },
  lg: { shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.16, shadowRadius:10, elevation:8 },
};

export function statusColor(s) {
  return { REQUESTED:C.sRequested, ACCEPTED:C.sAccepted, STARTED:C.sStarted,
           COMPLETED:C.sCompleted, CANCELLED:C.sCancelled }[s] ?? C.textSub;
}

export const gs = StyleSheet.create({
  flex1:   { flex:1 },
  row:     { flexDirection:'row', alignItems:'center' },
  center:  { alignItems:'center', justifyContent:'center' },
  screen:  { flex:1, backgroundColor:C.bg },
  card:    { backgroundColor:C.surface, borderRadius:R.md, padding:SP.md, marginBottom:SP.md, ...SH.sm },
});
