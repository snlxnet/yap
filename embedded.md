# The embedded workflow

What does runtime currently expose?

- SLIDE_WORD
- ua (user agent)
- slides (array)
- currentSlide
- lastIntervalId
- channel
- domshare
- videoObserver
- reload
- updateDisplayMode
- firstSlide
- lastSlide
- nextSlide
- prevSlide
- showAll
- showSlide
- findNotes
- wrapNotes
- createTimer
- prettifyNumber
- decodeXUriComponent
- findLabel
- isInViewBox
- createVideos
- fixVideos
- addControls
- createImages
- getTypstLabel
- getBox

That's a lot of functions! And 530 LOC.

Where the builder plugs in:
- isInViewBox
- firstSlide
- reload

Intentionally keep open:
- SLIDE_WORD
- currentSlide
- reload
- showSlide
- isInViewBox

This is kind of a mess:
- findLabel
- getTypstLabel

However, getTypstLabel is no longer used.
