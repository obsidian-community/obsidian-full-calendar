export function getColors(color: string | null | undefined): {
    color: string;
    textColor: string;
} {
    let textVar = getComputedStyle(document.body).getPropertyValue(
        "--text-on-accent"
    );
    if (color) {
        const m = color
            .slice(1)
            .match(color.length == 7 ? /(\S{2})/g : /(\S{1})/g);
        if (m) {
            const r = parseInt(m[0], 16),
                g = parseInt(m[1], 16),
                b = parseInt(m[2], 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness > 150) {
                textVar = "black";
            }
        }
    }

    return {
        color:
            color ||
            getComputedStyle(document.body).getPropertyValue(
                "--interactive-accent"
            ),
        textColor: textVar,
    };
}
