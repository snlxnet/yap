#import "yap.typ": video, controls

#let accent = rgb("#a8a5ff")

#set page(fill: rgb("#2e2d39"))
#set text(fill: rgb("#eeeeee"), font: "comfortaa", size: 14pt, weight: "bold")
#show heading: set text(fill: accent, size: 24pt)
#show raw: set text(fill: accent)

= Первые шаги
+ Откройте это в #underline[Inkscape] или Adobe Illustrator
+ Нарисуйте здесь любую фигуру: #v(9cm)
//+ #import "@preview/yap:0.1.0": video
//  #video("https://weldlab.github.io/video/omni.mp4")
+ Найдите ее в слое и дайте объекту имя
+ Скачайте какой-нибудь `.mp4`
+ Перетащите его мышкой на созданную форму в браузере

Скопируйте прямоугольник на фоне страницы и сдвиньте его вправо чтобы создать вторую страницу.

= Режим презентации
+ Создайте текстовый объект и напишите что-нибудь
+ Нажмите `Ctrl + G` чтобы сделать вокруг него группу
+ Переименуйте эту группу, чтобы она начиналась на `notes` (например, `notes 1`)
+ Расположите ее под фоном страницы

= Экспорт
Нажмите `Ctrl + E`, чтобы сохранить независимый HTML файл.

#let set-controls(..args) = place(dx: -1000mm, controls(..args))

#set-controls()

/* Manual post-processing
+ Ungroup the layer itself, making controls separate
+ Recreate the background as a rect
+ Give the controls their names
+ Join controls' labels into a single path object
*/

