//! Failure codes returned by the detection core.

use std::fmt;

/// Every way detection can fail.
///
/// The core never produces human-readable messages: callers map each code to a
/// localized message themselves.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ErrorCode {
    /// No foreground region survived noise removal and the minimum size filter.
    NoStickers,
    /// A side is longer than 8192 pixels or the image has more than 40,000,000 pixels.
    ImageTooLarge,
    /// A dimension is 0, the buffer length does not match the dimensions, the
    /// tolerance is above 100, the background is above `0xFFFFFF`, or a result
    /// index is out of range.
    InvalidInput,
}

impl ErrorCode {
    /// The code name, exactly as it crosses into JavaScript.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::NoStickers => "NoStickers",
            Self::ImageTooLarge => "ImageTooLarge",
            Self::InvalidInput => "InvalidInput",
        }
    }
}

impl fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::error::Error for ErrorCode {}

#[cfg(test)]
mod tests {
    use super::ErrorCode;

    #[test]
    fn error_codes_are_exact_names() {
        assert_eq!(ErrorCode::NoStickers.as_str(), "NoStickers");
        assert_eq!(ErrorCode::ImageTooLarge.as_str(), "ImageTooLarge");
        assert_eq!(ErrorCode::InvalidInput.as_str(), "InvalidInput");
        assert_eq!(ErrorCode::InvalidInput.to_string(), "InvalidInput");
    }
}
