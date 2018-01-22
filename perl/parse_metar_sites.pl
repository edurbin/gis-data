#!/usr/bin/perl -w
use strict;
use warnings;
use MongoDB();
#perl parse_metar_sites.pl ../conf/metar_sensors.txt
my $host = 'localhost';
my $port = 27017;
my $database = 'wxdata';
my $collection = 'MetarSite';
my $client = MongoDB::MongoClient->new(host => $host, port => $port);
my $db = $client->get_database($database);
my $metar_collection = $db->get_collection($collection);

sub trim($);
sub formatLatLon($);

while(<>){
    chomp;
    next if $. == 1;
    my @rec = unpack('a2 x1 a16 x1 a4 x2 a3 x2 a5 x2 a7 x2 a7 x1 a4');
    foreach(@rec) {
        $_ = trim($_);
    }
    next if $rec[2] eq "";
    formatLatLon($rec[6]);
    $metar_collection->insert({
	state => $rec[0],
        sensor_name => $rec[1],
        sensor_id => $rec[2],
        faa_id => $rec[3],
        synoptic_num => $rec[4],
        lat => formatLatLon($rec[5]),
        lon => formatLatLon($rec[6]),
        elevation => $rec[7],
    });    
}


sub trim($)
{
    my $string = shift;
    $string =~ s/^\s+//;
    $string =~ s/\s+$//;
    return $string;
}

sub formatLatLon($)
{
    my $latlon = shift;
    my ($degree, $minute, $direction) = ($latlon =~ m/(\d+)\s+(\d+)(\w)/);
    $minute = (sprintf "%.2f", ($minute / 60));
    $minute =~ s/^0\./\./;
    $latlon = $degree . $minute . "0000";
    $latlon = "-" . $latlon if $direction =~ m/W|S/;
    
    return $latlon;
}
