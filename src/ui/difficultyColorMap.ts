export const DifficultyColorMapper = {
  getColorForLevel(level: number): string {
    switch (level) {
      case 1: return 'rgba(0, 0, 255, 0.8)'; // deep blue
      case 2: return 'rgba(173, 216, 230, 0.8)'; // light blue
      case 3: return 'rgba(0, 128, 0, 0.8)'; // green
      case 4: return 'rgba(154, 205, 50, 0.8)'; // yellow-green
      case 5: return 'rgba(255, 255, 0, 0.8)'; // yellow
      case 6: return 'rgba(255, 200, 0, 0.8)'; // orange-yellow
      case 7: return 'rgba(255, 165, 0, 0.8)'; // orange
      case 8: return 'rgba(255, 69, 0, 0.8)'; // red-orange
      case 9: return 'rgba(255, 0, 0, 0.8)'; // red
      case 10: return 'rgba(139, 0, 0, 0.8)'; // dark red
      default: return 'rgba(255, 255, 255, 0.8)';
    }
  },
  
  getHexForLevel(level: number): string {
    switch (level) {
      case 1: return '#0000ff'; // deep blue
      case 2: return '#add8e6'; // light blue
      case 3: return '#008000'; // green
      case 4: return '#9acd32'; // yellow-green
      case 5: return '#ffff00'; // yellow
      case 6: return '#ffc800'; // orange-yellow
      case 7: return '#ffa500'; // orange
      case 8: return '#ff4500'; // red-orange
      case 9: return '#ff0000'; // red
      case 10: return '#8b0000'; // dark red
      default: return '#ffffff';
    }
  }
};
