import { Image, StyleSheet, View } from "react-native";

export function AuthLogo({ width = 132 }: { width?: number }) {
  return (
    <View style={[styles.frame, { width, height: Math.round(width * 0.82) }]}>
      <Image
        source={require("../assets/campus-drop-auth-logo.png")}
        accessibilityLabel="Campus Drop"
        resizeMode="contain"
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
