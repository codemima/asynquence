asynquence: 让异步JavaScript代码按顺序执行

原文链接: [asynquence: The Promises You Don’t Know Yet (Part 1)](http://davidwalsh.name/asynquence-part-1)

原文日期: 2014年6月17日

翻译日期: 2014年7月17日

翻译人员: [铁锚](http://blog.csdn.net/renfufei)

本系列博文, 重点介绍 [asynquence](http://github.com/getify/asynquence) 的功能, 
asynquence是基于承诺(promises-based)的流程控制(flow-control )抽象工具。

[Part 1: The Promises You Don't Know Yet](http://davidwalsh.name/asynquence-part-1)

[Part 2: More Than Just Promises](http://davidwalsh.name/asynquence-part-2)


### 本文尚不完整,请等待修正

### on("before", start)

通常,我的博文(主要是教程)的目的是讲述一些知识,在这个过程中,我会突出显示那些在某个领域探索和实验的项目。我发现这种方式对教学是一种很有效的辅助手段。

但这个博文系列里将介绍我参与的一个最重要、同时也有着广阔前景的项目: [asynquence](http://github.com/getify/asynquence). 其分类(topic) 归属于 Promises(承诺）和异步流程控制(async flow-control).



我以前写过一个详细的 博客系列 ,讲述关于承诺(promises)的一切和他们所能解决的异步(async)问题。
如果你想对这个主题(topic)做深入了解,在阅读这篇关于 asynquence 的漫谈之前,我强烈建议你先阅读 这些文章 .
http://blog.getify.com/promises-part-1/

译者推荐入门文章: [Promises与Javascript异步编程](http://www.zawaliang.com/2013/08/399.html)



为什么我要努力推广(hard-promoting) asynquence, 同时又要在这里自吹自擂呢(self-horn-tooting)? 因为它提供了一种独特的异步流控制和承诺,你可能还没意识到你需要的就是这个。

---------

asynquence不是明星受欢迎或谈论小集团真是酷毙了。它没有成千上万的星星在github或数以百万计的npm下载。但我强烈相信如果你花一些时间研究它能做什么,以及它如何能做到,你会找到一些丢失的清晰和救援的单调与其他异步工具集。

这是一个长期的职位,本系列有多个职位。很多炫耀。一定要花一些时间去消化我要告诉你的一切。你的代码会感谢你……最终。

低于5 k的最大大小(minzipped)所做的一切(包括可选插件!),我认为你会看到asynquence包相当温和的字节数的一拳。


Promise Or Abstraction?
首先要注意的是,尽管有一些API相似,asynquence创建一个抽象层上的承诺,我调用序列。这就是奇怪的名字来自:异步+ = asynquence序列。

一个序列是一系列的自动创建和链接的承诺。API表面下的承诺是隐藏的,所以您不必创建或链一般/简单的情况下。这样你可以利用的承诺与样板繁琐的东西少得多。

当然,简化asynquence融入您的项目,一个序列既可以使用标准thenable /承诺从其他自动售货,而且它还可以出售一个标准ES6承诺在任何步骤的序列。所以你有终极的自由吊索承诺或享受简单序列的抽象。

每个步骤的顺序可以任意简单,像一个立即履行承诺,或任意复杂的,像一个嵌套的序列,树等asynquence抽象提供了一个广泛的帮手来调用在每一步,像门(. .)(本地一样承诺Promise.all(. .)),运行2或更多的“片段”并行(内子步骤),并等待他们完成(以任意顺序)之前的主要序列。

你构建异步流控制表达式程序中的一项特殊的任务通过连接在一起,然而许多步骤序列中的适用。就像承诺,每一步可以成功(和传递任意数量的成功消息)或者失败(和消息传递任意数量的原因)。

在这篇文章中,我详细的一整套隐含限制当你所承诺,并使抽象的权力和效用。我做索赔,asynquence释放你从所有这些限制,所以这篇博文系列证明了这个说法。


Basics

你当然比阅读更感兴趣的代码我漫游在关于代码。那么,让我们首先说明asynquence的基本知识:

```js
ASQ(function step1(done){
    setTimeout(function(){
        done( "Hello" );
    },100);
})
.then(function step2(done,msg){
    setTimeout(function(){
        done( msg.toUpperCase()) ;
    },100);
})
.gate(
    // these two segments '3a' and '3b' run in parallel!
    function step3a(done,msg) {
        setTimeout(function(){
            done( msg + " World" );
            // if you wanted to fail this segment,
            // you would call `done.fail(..)` instead
        },500);
    },
    function step3b(done,msg) {
        setTimeout(function(){
            done( msg + " Everyone" );
        },300);
    }
)
.then(function step4(done,msg1,msg2){
    console.log(msg1,msg2); // "Hello World"  "Hello Everyone"
})
.or(function oops(err){
    // if any error occurs anywhere in the sequence,
    // you'll get notified here
});
```

只有片段,你看到一个很好的描绘asynquence最初是用来做什么。对于每一个步骤,创建一个承诺给你,和你提供的触发(我喜欢总是称之为为简单起见),现在你只需要调用或稍晚的时间。

如果发生错误,或者如果你想失败一步通过调用done.fail(. .),其余的序列路径是废弃的通知和任何错误处理程序。

Errors Not Lost

承诺,如果你不能注册一个错误处理程序,错误一直默默地埋藏在承诺未来消费者观察。这连同promise-chaining如何工作导致各种各样的混乱和细微差别。

如果你读这些讨论,您将看到我做的承诺有一个“选择”模式的错误处理,所以如果你忘了选择,默默地你失败了。这就是我们disaffectionately称之为“坑的失败”。

asynquence逆转这种模式,创建一个成功的“坑”。一个序列的默认行为是报告任何错误(故意或偶然的)在全球异常(在dev控制台),而不是接受它。当然,报道它在全球异常不消除序列的状态,所以它仍然可以通过编程的方式观察后像往常一样。

你可以“选择退出”的全球错误报告在两个方面:(1)注册至少一个序列或错误处理程序;(2)调用延迟()的序列,这表明你以后打算注册一个错误处理程序。

此外,如果序列被(组合成)是另一个序列B,A.defer()是自动调用时,错误处理负担转移到B,就像你想要的和期待。

承诺,你必须努力工作来确保捕获错误,如果你达不到,你会感到困惑,因为他们会隐藏在微妙,很难找方法。asynquence序列,你必须努力工作来捕获错误。asynquence使你的错误处理更容易和更理智。

Messages

与承诺,该决议(成功或失败)只能发生在一个不同的值。由你来包装多个值到一个容器(对象、数组等)需要通过多个值。

asynquence假设您需要通过任意数量的参数(成功或失败),并自动处理包装/ un-wrapping给你,在你最自然的期望:

```js
ASQ(function step1(done){
    done( "Hello", "World" );
})
.then(function step2(done,msg1,msg2){
    console.log(msg1,msg2); // "Hello"  "World"
});
```

事实上,信息可以很容易地注入一个序列:
```js
ASQ( "Hello", "World" )
.then(function step1(done,msg1,msg2){
    console.log(msg1,msg2); // "Hello"  "World"
})
.val( 42 )
.then(function(done,msg){
    console.log(msg); // 42
});
```
除了注入成功消息序列之外,您还可以创建一个自动失败序列(即消息错误原因):

```js
// make a failed sequence!
ASQ.failed( "Oops", "My bad" )
.then(..) // will never run!
.or(function(err1,err2){
    console.log(err1,err2); // "Oops"  "My bad"
});
```

Halting Problem

承诺,如果你有说4承诺链接,在步骤2你决定你不想3和4,你唯一的选择就是抛出一个错误。有时这是有道理的,但更经常而限制。

你可能喜欢就可以取消任何承诺。但是,如果承诺本身可以中止/取消从外面看,实际上违背了trustably外部不可变的状态的重要原则。

```js
var sq = ASQ(function step1(done){
    done(..);
})
.then(function step2(done){
    done.abort();
})
.then(function step3(done){
    // never called
});

// or, later:
sq.abort();
```

流产/取消不应该存在的承诺水平,但在抽象层之上。所以,asynquence允许您调用abort()在一个序列,或在任何步骤序列的触发器。尽可能,其余的序列将被完全废弃(副作用从异步任务无法预防,显然!)。

Sync Steps
尽管我们的代码在本质上是异步的,总是有任务,基本上是同步的。最常见的例子是执行数据提取或转换任务的序列:

```js
ASQ(function step1(done){
    done( "Hello", "World" );
})
// Note: `val(..)` doesn't receive a trigger!
.val(function step2(msg1,msg2){
    // sync data transformation step
    // `return` passes sync data messages along
    // `throw` passes sync error messages along
    return msg1 + " " + msg2;
})
.then(function step3(done,msg){
    console.log(msg); // "Hello World"
});
```

瓦尔(. .)方法自动步进步一步的承诺你回来后(或抛出错误!),所以它并不通过你一个触发器。你使用val(. .)对任何同步序列的中间步骤。

Callbacks

特别是在节点。js(error-first风格)回调是常态,并承诺是新生事物。这意味着你几乎可以肯定会将它们集成到异步序列代码。当您调用一些实用程序,预计error-first风格回调,asynquence提供errfcb()来创建一个,自动连接到你的序列:

```js
ASQ(function step1(done){
    // `done.errfcb` is already an error-first
    // style callback you can pass around, just like
    // `done` and `done.fail`.
    doSomething( done.errfcb );
})
.seq(function step2(){
    var sq = ASQ();

    // calling `sq.errfcb()` creates an error-first
    // style callback you can pass around.
    doSomethingElse( sq.errfcb() );

    return sq;
})
.then(..)
..
```

注意:完成。errfcb和sq.errfcb()的区别在于前者已经创建的,所以你不需要()调用它,而后者需要做出调连接到调用序列。

其他一些库提供包装其他函数调用的方法,但这似乎太侵入asynquence的设计理念。所以,sequence-producing包装方法,使你自己的,是这样的:

```js
// in node.js, using `fs` module,
// make a suitable sequence-producing
// wrapper for `fs.write(..)`
function fsWrite(filename,data) {
    var sq = ASQ();
    fs.write( filename, data, sq.errfcb() );
    return sq;
}

fsWrite( "meaningoflife.txt", "42" )
.val(function step2(){
    console.log("Phew!");
})
.or(function oops(err){
    // file writing failed!
});
```

Promises, Promises

asynquence应该在异步流控制不够好,对于几乎所有您的需要,这是所有你需要的工具。但现实是,承诺自己仍将出现在您的程序。asynquence很容易从承诺,承诺当你认为合适的序列。

```js
var sq = ASQ()
.then(..)
.promise( doTaskA() )
.then(..)
..

// doTaskB(..) requires you to pass
// a normal promise to it!
doTaskB( sq.toPromise() );
```

承诺(. .)使用一个或多个标准thenables /承诺贩卖假从其他地方(如内部doTaskA())和连接序列。toPromise()vends新承诺的序列中。所有的成功和错误消息流流的承诺完全按照你所期望的。

Sequences + Sequences

接下来你几乎肯定会发现自己经常做的是创建多个序列和连接在一起。

例如:

```js
var sq1 = doTaskA();
var sq2 = doTaskB();
var sq3 = doTaskC();

ASQ()
.gate(
    sq1,
    sq2
)
.then( sq3 )
.seq( doTaskD )
.then(function step4(done,msg){
    // Tasks A, B, C, and D are done
});
```

于sq1和sq2序列是独立的,所以他们可以直接连接的门(. .)段,或作为然后(. .)步骤。还有seq(. .),可以接受一个序列,或者更常见的,一个函数,它将调用序列。在上面的代码片段中,函数doTaskD(msg1 . .){…返回平方;}将一般的签名。它接收到的消息前一步(sq3),预计将返回一个新的序列步骤3。

注意:这是另一个API糖asynquence可以发光,因为promise-chain,连接在另一个承诺,你丑:

```js
pr1
.then(..)
.then(function(){
    return pr2;
})
..
```

如上所述,asynquence只接受直接序列(. .),如:
```js
sq1
.then(..)
.then(sq2)
..
```
当然,如果你发现需要手动线在一个序列,你可以管(. .):

```js
ASQ()
.then(function step1(done){
    // pipe the sequence returned from `doTaskA(..)`
    // into our main sequence
    doTaskA(..).pipe( done );
})
.then(function step2(done,msg){
    // Task A succeeded
})
.or(function oops(err){
    // errors from anywhere, even inside of the
    // Task A sequence
});
```

你合理的期望,在所有这些变化,成功和错误消息流管道,所以错误传播到最外层的自然和自动序列。这并不阻止你手动听在任何级别的子和处理错误,然而。

```js
ASQ()
.then(function step1(done){
    // instead of `pipe(..)`, manually send
    // success message stream along, but handle
    // errors here
    doTaskA()
    .val(done)
    .or(function taskAOops(err){
        // handle Task A's errors here only!
    });
})
.then(function step2(done,msg){
    // Task A succeeded
})
.or(function oops(err){
    // will not receive errors from Task A sequence
});
```

Forks > Spoons

你可能需要一个序列分割成两个独立的路径,所以fork()提供:

```js
var sq1 = ASQ(..).then(..)..;

var sq2 = sq1.fork();

sq1.then(..)..; // original sequence

sq2.then(..)..; // separate forked sequence
```

在这个片段,sq2不会继续作为独立的序列,直到pre-forked序列步骤完成(成功)。


Sugary Abstractions

好吧,这就是你需要知道的关于asynquence的基本核心。虽然有相当多的权力,它仍然是相当有限的功能列表相比,像“Q”和“异步”的工具。幸运的是,asynquence有更多的秘技。

除了asynquence核心之外,您还可以使用一个或多个asynquence-contrib提供的插件,添加许多美味的抽象的帮手。contrib builder允许您选择哪一个你想要的,但构建全部进入普通发布版。js默认包。事实上,你甚至可以让你自己的插件很容易,但我们将在本系列下一篇文章中讨论。

Gate Variations

有6个简单的变化的核心门(. .)/(. .)所有功能提供普通发布版插件:任何(. .),第一个(. .),种族(. .),去年(. .),没有一个(. .),地图(. .)。

任何(. .)等待所有段完成就像门(. .),但只有其中一人必须是一个成功的主要序列继续。如果没有成功,到主序列设置为错误状态。

第一(. .)只有等待主序列成功前的首次成功段(后续段只是忽略)。如果没有成功,到主序列设置为错误状态。

种族(. .)是相同的概念到本机Promise.race(. .),(有点像第一(. .),除了它的赛车完成无论成功或失败。

去年(. .)等待所有段完成,但只有最新的成功部分成功的消息(如果有的话)一起发送到主序列继续。如果没有成功,到主序列设置为错误状态。

没有(. .)等待所有段完成。然后它会成功和错误状态,影响到主序列的收益只有在所有领域失败了,但是在错误如果任何或所有部分成功。

地图(. .)是一个异步的“地图”工具,就像你会发现其他库/实用工具。需要一个数组的值,对每个值函数调用,但它假设映射可能是异步的。原因列为一门(. .)变体是它调用所有并行映射,并等待所有完成之前收益。地图(. .)可以使用数组或迭代器回调或直接提供给它,从前面的主序步骤或消息。

```js
ASQ(function step1(done){
    setTimeout(function(){
        done( [1,2,3] );
    });
})
.map(function step2(item,done){
    setTimeout(function(){
        done( item * 2 );
    },100);
})
.val(function(arr){
    console.log(arr); // [2,4,6]
});
```

Step Variations


其他插件提供语义变化正常步骤,比如直到(. .),尝试(. .),瀑布(. .)。

直到(. .)保持re-trying一步,直到成功,或者你叫done.break()从里面(触发错误状态在主序)。

(. .)尝试了一步,与成功收益序列。如果抓住一个错误/故障,它作为一种特殊的成功消息转发的{捕捉:. .}。

瀑布(. .)需要多个步骤(如,将提供(. .)调用),并对其进行处理。然而,瀑布从每一步成功消息(s)到下一个,这样瀑布完成后,所有的成功消息被传递到后续步骤。它可以节省您不必手动收集和传递,可以相当乏味的如果您有许多步骤的瀑布。

--

Higher Order Abstractions

你能想到的任何抽象,可以表示为上面的公用事业和抽象的结合。如果你有一个共同的抽象你经常发现自己做的,你可以让它repeatably可用通过投入自己的插件(再一次,在下一篇文章)。

一个例子将会为一个序列提供超时,使用种族(. .)(上图)解释和failAfter(. .)插件(听起来,使得一系列失败之后指定的延迟):

```js
ASQ()
.race(
    // returns a sequence for some task
    doSomeTask(),
    // makes a sequence that will fail eventually
    ASQ.failAfter( 2000, "Timed Out!" )
)
.then(..)
.or(..);
```
这个例子设置一个种族之间的正常序列和一个eventually-failing序列,提供一个超时的语义限制。

如果你发现自己经常这样做,你可以很容易地做出timeoutLimit上述抽象(. .)插件(见下一篇文章)。

Functional (Array) Operations

上述例子提出一个基本假设,即提前你知道什么你的流控制步骤。

不过,有时你需要应对不同的步骤,如每一步代表一个资源请求,您可能需要请求3或30。

使用一些非常简单的函数式编程操作,比如数组映射(. .)和减少(. .),与活中我们可以很容易地实现这种灵活性,但你会发现asynquence的API糖使这样的任务甚至更好。

注意:如果您不知道map / reduce,你会想要花些时间(上衣)只需要几小时学习它们,你会发现其效用在promises-based编码!

Functional Example

比方说你想请求并行3(或更多)文件,尽快使其内容,但确保他们仍然呈现自然秩序。如果file1 file2之前回来,马上呈现file1。如果file2回来先,等到file1然后渲染。

这里就是你可以用正常的承诺(我们将忽略错误处理简化为目的):

```js
function getFile(file) {
    return new Promise(function(resolve){
        ajax(file,resolve);
    });
}

// Request all files at once in "parallel" via `getFile(..)`
[ "file1", "file2", "file3" ]
.map(getFile)
.reduce(
    function(chain,filePromise){
        return chain
            .then(function(){
                return filePromise;
            })
            .then(output);
    },
    Promise.resolve() // fulfilled promise to start chain
)
.then(function() {
    output("Complete!");
});
```

不太坏,如果你解析与地图(. .)发生的事情,然后减少(. .)。地图(. .)调用字符串数组转化为一系列的承诺。减少(. .)称之为“降低”的承诺为一个数组链的承诺,将执行的步骤。

现在,让我们看看asynquence如何做同样的任务:
```js
function getFile(file) {
    return ASQ(function(done){
        ajax(file,done);
    });
}

ASQ()
.seq.apply(null,
    [ "file1", "file2", "file3" ]
    .map(getFile)
    .map(function(sq){
        return function(){
            return sq.val(output);
        };
    })
)
.val(function(){
    output("Complete!");
});
```

注意:这些都是同步映射调用,所以使用asynquence没有真正的好处是异步映射(. .)插件。

由于asynquence的一些API的糖,你可以看到我们不需要减少(. .),我们只使用两个地图(. .)调用。第一个字符串数组转化为数组序列。第二个数组序列转化为函数,每个返回的子数组。这第二个数组作为参数发送到seq asynquence(. .)调用,每个子过程。

简单的蛋糕,对吗?

.summary(..)

如果将本文读到这里, 我认为你应该明白 asynquence 的意思了。它很强大,也很简洁,和其他库比起来,没有那些毫不相干的冗余代码,特别是和原生的(native) promises 相比.

它有很好的扩展性(通过插件,下一篇文章将会介绍),所以几乎对你没有限制,不论你想做什么。

现在, 我希望你有信心试用一下 asynquence .

如果 asynquence 提供的只是一个 promise 抽象和API语法糖的话 ,那它就不会明显比同类的类库更加知名。下一篇文章 将会在promises 之外介绍一些更高级的异步功能。让我们一起去看看这个坑(rabbit hole ,兔子洞)到底有多深吧。

http://davidwalsh.name/asynquence-part-2


